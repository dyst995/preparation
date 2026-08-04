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

## Senior-Level Best Practices

### Rapid-fire scenario responses (say these in one breath)
- "A profile photo needs to load fast for millions of users." -> CloudFront in front of a private S3 bucket via Origin Access Control, not a public bucket directly.
- "A user's medical document needs to be downloadable for 10 minutes after a doctor requests it." -> Presigned GET URL, expiry matched to the actual need (minutes), generated after an authorization check.
- "One event needs to trigger a push notification, an email, and an analytics update." -> SNS topic with three independent subscribers (ideally each behind its own SQS queue for durability).
- "A Lambda subscriber has been failing silently for days." -> Missing DLQ and alerting; configure a dead-letter queue and alert on non-zero depth.
- "A bucket was accidentally made public during a config change." -> Should be caught immediately by an automated public-access-change alert (AWS Config/GuardDuty), not discovered manually weeks later.

### Decision framework: public bucket vs signed/presigned URL vs CloudFront-signed URL
- Content is meant to be public forever and rarely changes (marketing images, public app assets) -> public bucket/object (or better, CloudFront in front of a private bucket via Origin Access Control) is fine, but should be a deliberate, reviewed decision, not a default.
- Content is user-specific or sensitive (KYC documents, medical records, private photos) -> keep the bucket fully private, use short-lived presigned URLs generated per request after an authorization check.
- Content is public-ish but needs some access control or expiry (e.g. a shareable link that should stop working after 24 hours) -> CloudFront signed URLs/cookies in front of a private S3 origin, giving CDN caching plus expiring access.
- High request volume for the same public assets -> CloudFront (or another CDN) in front of S3 regardless of public/private, since serving directly from S3 at scale is more expensive and higher-latency than a CDN edge cache.

### S3 security production checklist
- [ ] "Block Public Access" is enabled at the account level by default, and any bucket that genuinely needs public objects is an explicit, documented exception - not a bucket that happens to lack the setting.
- [ ] Bucket policies and IAM policies follow least privilege: an application's role can `PutObject`/`GetObject` only under the specific key prefix it needs, not `s3:*` on the whole bucket.
- [ ] IAM roles are scoped per-service rather than one shared "app role" reused everywhere, so a compromise or misconfiguration in one service can't cascade into every bucket the account owns.
- [ ] Presigned URL expiry is as short as the use case allows (minutes for uploads, not hours), and generation always happens server-side after an authorization check - never let the client choose the key/path unchecked.
- [ ] Server-side encryption (SSE-S3 or SSE-KMS) is enabled on buckets holding anything sensitive, and KMS key policies are reviewed alongside bucket policies.
- [ ] Versioning is enabled on buckets where accidental overwrite/delete would be costly, with a lifecycle policy to expire old versions rather than keeping them forever.
- [ ] CloudTrail/S3 access logging is enabled on sensitive buckets so "who accessed this object and when" is answerable after the fact, not just in theory.
- [ ] Multipart upload aborts are configured via lifecycle rules, since abandoned large-file uploads silently accumulate storage cost otherwise.
- [ ] Cross-account or cross-service access is scoped through explicit bucket policy statements, reviewed the same way as IAM policy changes.

### Worked scenario: designing the KYC document upload flow end to end
1. **Bucket setup**: a dedicated, fully private bucket (not shared with public assets) with Block Public Access enforced and SSE-KMS encryption enabled.
2. **Key design**: `kyc/{userId}/{documentType}/{uuid}.{ext}`, generated entirely server-side after verifying the authenticated user matches `userId` - never accept a client-supplied key.
3. **Upload**: backend issues a short-expiry (5-10 min) presigned PUT URL scoped to that exact key and content type; the mobile app uploads directly to S3.
4. **Confirmation**: the app notifies the backend on completion, which records the key/metadata in the database and marks the KYC record pending review - the backend never touches the file bytes.
5. **Access for review**: an internal reviewer's dashboard requests a short-expiry presigned GET URL per document view, generated only after checking the reviewer's authorization, never a permanent public link.
6. **Audit**: S3 access logging enabled on this bucket specifically, since KYC documents are exactly the kind of data where "who viewed this and when" needs to be answerable for compliance reasons.

### Anti-patterns and failure modes
| Anti-pattern | Failure mode | Fix |
|---|---|---|
| Making a bucket public "just to make this one image work" | Entire bucket exposed, not just the intended object; classic breach headline | Scope to specific objects via CloudFront + OAC, or presigned URLs |
| Long-lived presigned URLs (hours/days) for sensitive documents | URL leaks via logs/browser history/screenshot remain valid for a long exposure window | Minutes-long expiry, regenerate per request |
| Client supplies the S3 key/path directly with no server-side validation | Path traversal / overwriting other users' objects / key enumeration | Server generates the key (namespaced by authenticated user id + UUID), never trusts client input directly |
| One IAM role with `s3:*` shared across every service | A bug or compromise in one service can read/write/delete every bucket the account owns | Narrow, per-service IAM roles scoped to specific buckets/prefixes/actions |
| No lifecycle policy on an ever-growing bucket | Storage costs grow unbounded, including old versions and incomplete multipart uploads | Lifecycle rules to transition/expire old data and abort incomplete uploads |

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| A user can access another user's file | Client-influenced S3 key with no server-side scoping | Audit key-generation logic for authenticated-user namespacing |
| Bucket suddenly flagged as public in a security scan | An accidental policy/ACL change | Check CloudTrail for the specific change and who made it |
| Upload URLs work but files never appear | Presigned PUT content-type/headers mismatch with the actual request | Compare the signed request parameters to what the client actually sent |
| SNS subscriber stopped processing events days ago | No DLQ, silent delivery failures | Check subscription delivery metrics and DLQ depth |
| Storage costs climbing steadily | No lifecycle policy on an ever-growing bucket | Review object versions and incomplete multipart uploads |

### Observability for S3/SNS-backed features
- Enable S3 server access logging or CloudTrail data events on sensitive buckets, and actually review/alert on anomalous access patterns (unexpected IP ranges, unusual volume), not just store the logs.
- Track presigned URL generation vs actual usage - a large gap (many generated, few used) can indicate a UX problem (uploads failing silently) or a client-side bug requesting URLs it never uses.
- Monitor SNS delivery failures/DLQ (dead-letter queue) depth for subscriptions - a silently failing subscriber (e.g. a webhook endpoint that started rejecting requests) is invisible unless you're watching delivery success rates.
- Alert on unexpected public-access changes to any bucket (AWS Config rules or GuardDuty can flag this) - a bucket becoming public is exactly the kind of change that should never happen silently.

### Scalability and team practices
- Treat IAM/bucket policy changes with the same review rigor as code changes - a policy typo that widens access is a security incident waiting to happen, not a minor config tweak.
- Standardize a key-naming convention across services (e.g. `{env}/{service}/{userId}/{uuid}-{filename}`) so access patterns, lifecycle rules, and cost attribution stay manageable as the number of buckets/prefixes grows.
- Document which buckets are intentionally public and why, reviewed periodically - "why is this public" should always have a fast, confident answer, not an "I think that's for..." guess.
- For SNS fan-out architectures, document the topic-to-subscriber map somewhere visible (not just tribal knowledge), since "what happens when this event fires" becomes hard to trace as more consumers get added over time.

### Senior follow-up Q&A
1. **A presigned upload URL your backend generated is somehow being used to overwrite a different user's file. What went wrong, and how do you prevent it?** -> Most likely the S3 key wasn't properly scoped/validated server-side - if the client can influence the key and the backend didn't enforce a namespace tied to the authenticated user, one user's presigned URL could target another user's object path. Fix: always generate the key server-side from the authenticated user's id plus a random/UUID component, never trust a client-supplied path directly.
2. **How would you serve user-uploaded profile photos publicly (fast, cacheable) while keeping the original bucket private?** -> Put CloudFront in front of the private S3 bucket using Origin Access Control (so only CloudFront, not the public internet, can read the bucket directly), and either make the specific derived/resized image objects cacheable and public at the CloudFront layer, or use CloudFront signed URLs/cookies if per-user access control is still needed even for the "public-facing" image.
3. **You need to let a user download a large exported report file without routing it through your backend. What do you build?** -> Generate the report asynchronously (background job), store it in a private S3 bucket, then hand the user a presigned GET URL with a reasonably short expiry once it's ready - the backend never touches the file bytes for delivery, and expiry limits how long the download link keeps working if it leaks.
4. **How do you decide the IAM permissions for a Lambda/service that only needs to write new uploads, never read or delete existing ones?** -> Grant only `s3:PutObject` (and `s3:PutObjectTagging` if needed) scoped to the specific bucket and key prefix that service writes to - explicitly deny or simply omit `GetObject`/`DeleteObject`/`ListBucket` unless there's a proven need, following least privilege even when it's "probably fine" to grant more.
5. **An SNS-triggered Lambda subscriber has been silently failing for two days. How do you catch this earlier next time?** -> Configure a dead-letter queue (DLQ) on the subscription so failed deliveries land somewhere visible instead of vanishing, and alert on DLQ depth growing above zero - "silently failing" should really mean "failing loudly into a queue that pages someone," not disappearing.
6. **When would combining SNS + SQS actually be worse than just calling each downstream service directly via HTTP?** -> For a small, fixed number of consumers with simple, synchronous needs and low volume, direct calls (or a simple job queue) can be simpler to reason about and debug than the added infrastructure of topics/queues/subscriptions. Pub/sub fan-out earns its complexity when you have multiple, independently-scaling, potentially-flaky consumers where you need durability and decoupling - not by default for every event in the system.
7. **Why does key design (the string path, not just access control) matter for a sensitive-document bucket?** -> A predictable or client-influenced key risks enumeration or collision (two users' uploads landing at the same path) and makes lifecycle/audit rules harder to scope precisely. A server-generated key namespaced by authenticated user id plus a random UUID guarantees uniqueness, makes per-user lifecycle/deletion rules trivial to write, and ensures access-control logic can reason about "does this key belong to this user" from the path alone as a sanity check, independent of the database.

---

## Mastery checklist

- [ ] I can explain S3 as object storage, distinct from a filesystem or database.
- [ ] I can explain and generate (in pseudocode) a presigned URL, including why short expiry matters.
- [ ] I can design a safe upload flow that avoids routing files through my backend.
- [ ] I can explain SNS pub/sub and give a concrete fan-out example.
- [ ] I can clearly distinguish SNS from SQS and describe when to combine them.
