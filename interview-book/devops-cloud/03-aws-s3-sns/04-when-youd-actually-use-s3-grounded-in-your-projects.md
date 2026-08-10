# 04. When you'd actually use S3 (grounded in your projects)

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

| Feature (hypothetical, grounded in your CV domains) | Why S3 fits |
|---|---|
| VetApp: uploading pet medical records/documents | Durable, private-by-default blob storage; presigned URLs for direct upload/download |
| Clean House: delivery proof photos, warehouse item photos | Same pattern; mobile app uploads directly, backend just stores the key |
| EasyPay: KYC/ID document uploads for onboarding | Needs strict access control - private bucket, presigned URLs with short expiry, possibly server-side encryption |
| Any app: static asset hosting / CDN origin | S3 + CloudFront as an origin for images/static files at scale |

You would generally NOT use S3 for: things that need to be queried/filtered (that's a database's job), data that changes very frequently in small increments (S3 objects are typically replaced wholesale, not patched), or anything requiring strong transactional guarantees across multiple objects.

---
