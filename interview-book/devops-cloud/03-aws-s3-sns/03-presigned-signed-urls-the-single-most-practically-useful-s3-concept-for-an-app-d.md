# 03. Presigned (signed) URLs - the single most practically useful S3 concept for an app developer

> Source: `interview-prep/devops-cloud/03-aws-s3-sns.md`

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
