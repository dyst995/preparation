# 01. S3: object storage fundamentals

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
