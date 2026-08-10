# 09. Senior red flags / green flags

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
