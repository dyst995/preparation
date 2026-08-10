# 02. Access control basics

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
