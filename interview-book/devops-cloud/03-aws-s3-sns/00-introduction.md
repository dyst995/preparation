# 03-aws-s3-sns — Introduction

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
