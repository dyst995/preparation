# 11. Senior-Level Best Practices

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
