# 07. Interview question bank (with answer targets)

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
