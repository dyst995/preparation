03 - AWS S3 & SNS

Goal: Explain S3 and SNS at a practical, "I've used this in a real feature" level - object storage, presigned/signed URLs for uploads, pub/sub notification fan-out - and know when you'd reach for each versus alternatives, tied to features you'd realistically build (file uploads on VetApp, image uploads on Clean House, push/notification-style fan-out).

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain what S3 is (object storage) and how it differs from a filesystem or a database.
2. Explain buckets, objects, keys, and basic access control (public vs private, bucket policies vs IAM vs ACLs at an awareness level).
3. Explain presigned/signed URLs: what problem they solve and how to generate one.
4. Design a safe file-upload flow (e.g. profile photo, pet medical file, delivery proof photo) using S3 without routing large files through your own backend.
5. Explain SNS: topics, subscriptions, pub/sub, and fan-out.
6. Explain SNS vs SQS at a level that shows you know they solve different problems.
7. Give a grounded answer to "when would you use S3" and "when would you use SNS" instead of generic AWS trivia.

---

## 1. S3: object storage fundamentals

### Topics to learn
- [ ] Object storage vs block storage vs a database: S3 stores opaque blobs (objects) keyed by a string path, not files-on-a-disk or rows-in-a-table
- [ ] Bucket = a top-level namespace/container; globally unique bucket names
- [ ] Object = the actual file/blob, identified by a key (essentially a path-like string) inside a bucket
- [ ] Durability/availability characteristics (11 nines durability - AWS's own marketing number, know it exists, don't over-index on exact digits)
- [ ] Storage classes (Standard, Infrequent Access, Glacier) - awareness only, cost/retrieval-time trade-off
- [ ] S3 is not a filesystem: no real directories (keys just contain `/` characters that consoles render as folders), no partial in-place file edits

### Mental model

Think of S3 as a giant, extremely durable key-value store where the value is a binary blob and the key is a string like `uploads/pets/42/vaccination-record.pdf`. There's no actual folder `uploads/pets/42/` - that's just how S3 console UIs visually group objects that share a key prefix. This distinction matters because it explains why "listing a folder" in S3 is really a prefix query, not a real filesystem directory listing.

### Model spoken answer

"S3 is object storage - you store and retrieve binary blobs by key inside a bucket, it's not a filesystem or a database. There's no real folder hierarchy; keys are just strings, and anything that looks like a folder in the console is really just a shared key prefix. It's built for durability and scale rather than for things like partial in-place edits or strong directory semantics, which is exactly why it's a good fit for files like uploaded documents, images, and backups rather than something you'd treat like a live filesystem."

---

## 2. Access control basics

### Topics to learn
- [ ] Buckets/objects are private by default
- [ ] IAM policies (attached to users/roles - what actions they're allowed to take)
- [ ] Bucket policies (attached to the bucket itself - who/what can access it)
- [ ] Object ACLs (legacy-ish, largely superseded by bucket policies + IAM in modern setups; AWS now recommends disabling ACLs on most buckets)
- [ ] Public bucket/object access is an explicit opt-in and a common security misconfiguration to be aware of
- [ ] "Block Public Access" account/bucket-level setting as a safety net

### Model spoken answer

"Everything in S3 is private by default. Access is controlled through IAM policies on the identity making the request, and/or bucket policies attached to the bucket itself. Making something public is an explicit, deliberate action, and it's one of the most common real-world cloud security misconfigurations, so AWS added account-level 'Block Public Access' settings as a safety net. For anything sensitive - like a user's uploaded ID document or a medical record - I'd keep the bucket fully private and use presigned URLs to grant temporary, scoped access instead of making anything public."

---

## 3. Presigned (signed) URLs - the single most practically useful S3 concept for an app developer

### Topics to learn
- [ ] The problem: you want a client (mobile app/browser) to upload/download a file directly to/from S3, without routing the file's bytes through your own backend
- [ ] A presigned URL is a normal S3 URL with a cryptographic signature and expiry baked into the query string, generated server-side using your AWS credentials, that temporarily grants a specific action (GET or PUT, typically) without the client needing any AWS credentials of its own
- [ ] Typical flow: client asks your backend for a presigned upload URL -> backend generates it (short expiry, e.g. 5-15 min) -> client uploads directly to S3 using that URL -> backend is later notified (either the client calls back, or via S3 event notifications) that the upload completed
- [ ] Why this is better than uploading through your backend: avoids doubling bandwidth/memory usage on your server, avoids your backend becoming a bottleneck for large files, scales better

### Presigned URL flow diagram (described)

1. Mobile app requests: "I want to upload a vaccination record PDF for pet #42."
2. Backend validates the user is allowed to do this, generates a presigned PUT URL for key `pets/42/vaccination-record-<uuid>.pdf` with a 10-minute expiry, and returns it to the app.
3. Mobile app uploads the file bytes directly to that URL via an HTTP PUT request - S3 receives the file directly, your backend server never touches the file bytes.
4. Mobile app tells the backend "upload finished," and the backend saves the S3 key/URL in the `medical_records` (or similar) table.

### Example: generating a presigned URL (Node.js AWS SDK v3)

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'eu-central-1' });

async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: 'vetapp-uploads',
    Key: key,
    ContentType: contentType,
  });
  // expiresIn is in seconds
  return getSignedUrl(s3, command, { expiresIn: 600 });
}

async function getDownloadUrl(key: string) {
  const command = new GetObjectCommand({ Bucket: 'vetapp-uploads', Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}
```

### Why short expiry matters

A presigned URL is a bearer credential - anyone with the URL can perform the signed action until it expires, no further authentication required. Keeping expiry short (minutes, not hours/days) limits the exposure window if a URL leaks (e.g. via logs, browser history, or a screenshot).

### Model spoken answer

"For file uploads, I avoid routing the actual file bytes through my own backend - instead I generate a presigned URL server-side, scoped to a specific S3 key and a short expiry, and hand it to the client. The client uploads directly to S3 with that URL, and the backend only ever deals with metadata - the resulting key or URL gets saved against the relevant record, like a medical record or a delivery proof photo. This keeps the backend from becoming a bandwidth bottleneck and avoids ever holding large binary payloads in application memory just to relay them somewhere else."

---

## 4. When you'd actually use S3 (grounded in your projects)

| Feature (hypothetical, grounded in your CV domains) | Why S3 fits |
|---|---|
| VetApp: uploading pet medical records/documents | Durable, private-by-default blob storage; presigned URLs for direct upload/download |
| Clean House: delivery proof photos, warehouse item photos | Same pattern; mobile app uploads directly, backend just stores the key |
| EasyPay: KYC/ID document uploads for onboarding | Needs strict access control - private bucket, presigned URLs with short expiry, possibly server-side encryption |
| Any app: static asset hosting / CDN origin | S3 + CloudFront as an origin for images/static files at scale |

You would generally NOT use S3 for: things that need to be queried/filtered (that's a database's job), data that changes very frequently in small increments (S3 objects are typically replaced wholesale, not patched), or anything requiring strong transactional guarantees across multiple objects.

---

## 5. SNS: pub/sub and fan-out

### Topics to learn
- [ ] SNS = Simple Notification Service, a pub/sub messaging service
- [ ] Topic = a named channel that publishers send messages to
- [ ] Subscription = an endpoint (email, SMS, HTTP(S) webhook, SQS queue, Lambda function, mobile push) that receives messages published to a topic
- [ ] Fan-out pattern: one message published, delivered to many different subscribers simultaneously
- [ ] SNS is push-based and "fire and forget" from the publisher's perspective for most subscriber types

### Mental model

A publisher doesn't need to know who's listening - it just publishes a message to a topic. SNS then delivers a copy of that message to every current subscriber. This decouples the producer of an event from the consumers of that event, and lets you add new consumers later without changing the publisher at all.

### Example use case grounded in your domain

"A payment succeeds on VetApp/EasyPay-style backend. We want to: send a push notification to the user's phone, send a confirmation email, and update an internal analytics pipeline - all as a result of one event."

Without pub/sub, your payment-success code would need to directly call three different services (push, email, analytics), coupling payment logic to all of them and making it awkward to add a fourth consumer later.

With SNS:

```
Payment service --publishes--> SNS Topic: "payment.succeeded"
                                     |-- subscriber: Push notification Lambda
                                     |-- subscriber: Email service (via SQS queue)
                                     |-- subscriber: Analytics ingestion (via SQS queue)
```

The payment service publishes one message to the topic and moves on. Each subscriber independently receives and processes its own copy, and you can add a new subscriber (e.g. a fraud-detection service) without touching the payment code at all.

### Model spoken answer

"SNS is a pub/sub service - publishers send a message to a topic without knowing who's listening, and SNS fans it out to every subscriber, which could be an email endpoint, SMS, a mobile push endpoint, an SQS queue, or a Lambda function. I'd reach for it when one event needs to trigger multiple independent downstream actions - like a successful payment needing to trigger a push notification, an email receipt, and an analytics event - since it decouples the event producer from however many consumers exist, and lets you add new consumers later without touching the original code."

---

## 6. SNS vs SQS (a very common paired interview question)

| | SNS | SQS |
|---|---|---|
| Pattern | Pub/sub (fan-out to many subscribers) | Point-to-point queue (one message consumed once by one worker, typically) |
| Delivery | Pushed to subscribers | Pulled by consumers (polling) |
| Multiple consumers of the same message | Yes, natively (one message to N subscribers) | Not directly - each message is normally consumed once; fan-out to multiple SQS queues is achieved by subscribing multiple SQS queues to one SNS topic |
| Typical use | "Notify everyone interested that X happened" | "Reliably process each job exactly once, with retry/backoff, at your consumer's own pace" |

**A very common, well-regarded real pattern:** combine both - publish to an SNS topic, and have multiple SQS queues subscribed to that topic, one per consumer service. This gives you fan-out (SNS) plus durable, retryable, independently-paced processing per consumer (SQS) - each consumer gets its own queue and can process at its own speed without messages being lost if that consumer is temporarily down, since SQS retains messages until they're processed or expire.

### Model spoken answer

"SNS and SQS solve different problems. SNS is push-based pub/sub - great for broadcasting one event to many independent subscribers. SQS is a durable point-to-point queue - great for reliable, retryable processing of individual jobs by a worker at its own pace. A common pattern is to combine them: publish once to an SNS topic, with multiple SQS queues subscribed underneath it, so you get fan-out to multiple consumers while each consumer also gets the durability and retry semantics of a queue, instead of losing a notification if it was down when SNS tried to push it directly."

---

## Interview question bank (with answer targets)

1. **What is S3, and how is it different from a regular filesystem?** -> object storage, blobs keyed by string, no real directory hierarchy, no partial in-place edits.
2. **Are S3 buckets public or private by default?** -> private by default; public access is an explicit, deliberate configuration.
3. **What's a presigned URL, and why would you use one?** -> a time-limited, signed URL granting a specific action (GET/PUT) without requiring the client to hold AWS credentials; used to let clients upload/download directly to/from S3 without routing bytes through your backend.
4. **Walk through a safe file-upload flow using S3.** -> client requests a presigned PUT URL from backend after auth/validation; client uploads directly to S3; backend stores the resulting key/metadata once notified.
5. **Why keep presigned URL expiry short?** -> it's a bearer credential; anyone with the URL can act until expiry; short expiry limits leak exposure.
6. **What is SNS, and what problem does pub/sub solve?** -> decouples event producers from consumers; one publish, many independent subscribers, easy to add new consumers later.
7. **SNS vs SQS - what's the core difference?** -> push-based fan-out to many subscribers vs a durable, pull-based point-to-point queue for reliable processing.
8. **Describe a real scenario where you'd combine SNS and SQS.** -> publish once to SNS, multiple SQS queues subscribed underneath for independent, durable, retryable consumers.
9. **When would you NOT use S3?** -> data you need to query/filter (use a database), frequently small-mutated data, anything needing cross-object transactional guarantees.
10. **What AWS mechanism prevents accidental public exposure of a bucket?** -> "Block Public Access" account/bucket-level setting, plus deliberately scoped IAM/bucket policies.

---

## Hands-on drills (do these)

- [ ] Explain, without notes, the full presigned-URL upload flow for a file, from client request to backend metadata save.
- [ ] Write (from memory, pseudocode is fine) the backend function that generates a presigned PUT URL.
- [ ] Explain SNS vs SQS with a concrete example from a domain you know (payments, deliveries, notifications).
- [ ] Describe one place in a project you've worked on (or could imagine working on, e.g. VetApp file uploads or Clean House delivery photos) where a presigned URL upload flow would be the right design, and why routing the file through the backend would be worse.

---

## Senior red flags / green flags

### Green flags
- Explaining presigned URLs correctly, including why expiry should be short.
- Correctly separating SNS (pub/sub fan-out) from SQS (durable queue) instead of treating them as interchangeable "AWS messaging."
- Knowing that S3 buckets are private by default and that public access is an explicit misconfiguration risk, not a default behavior to be casual about.
- Giving a concrete, product-grounded example instead of only reciting AWS documentation trivia.

### Red flags
- Suggesting files should be uploaded through the app backend by default "because it's simpler," with no awareness of the bandwidth/scaling cost.
- Confusing SNS and SQS, or claiming they do the same thing.
- Assuming S3 is like a normal filesystem with real folders and in-place edits.
- Not knowing that public bucket access is opt-in, not default.

---

## Tie-backs to your experience

- Your CV explicitly lists AWS (S3, SNS) under DevOps & Cloud, and your freelance work built "full-stack applications using React, Next.js, NestJS, React Native, PostgreSQL, MySQL, Socket.IO, Firebase, and AWS" - you can frame S3/SNS knowledge as part of that same full-stack delivery capability.
- Feature domains you've actually built - file uploads on VetApp (medical records, presumably documents), barcode/warehouse workflows and delivery updates on Clean House, document/photo needs in fintech-style KYC flows on EasyPay - are all natural, honest anchors for "here's where I'd use S3" and "here's where a pub/sub fan-out via SNS would help" answers, even if the exact implementation used Firebase or another provider in practice; you can honestly frame it as "the pattern is the same regardless of provider."

---

## Mastery checklist

- [ ] I can explain S3 as object storage, distinct from a filesystem or database.
- [ ] I can explain and generate (in pseudocode) a presigned URL, including why short expiry matters.
- [ ] I can design a safe upload flow that avoids routing files through my backend.
- [ ] I can explain SNS pub/sub and give a concrete fan-out example.
- [ ] I can clearly distinguish SNS from SQS and describe when to combine them.
