# 02. Streams

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Topics to learn
- [ ] Four stream types: Readable, Writable, Duplex, Transform
- [ ] Why streams exist: process data incrementally instead of loading everything into memory
- [ ] Backpressure: what it is, why `.pipe()` handles it automatically, what happens if you ignore it
- [ ] Real backend use case: file uploads (VetApp file uploads, e.g. veterinary records/documents) without buffering entire files in memory
- [ ] Piping (`readable.pipe(writable)`) and error propagation gotchas (`pipe()` does NOT forward errors automatically - must handle on each stream or use `pipeline()`)
- [ ] `stream.pipeline()` / `stream/promises` for safer composition with proper cleanup

### Why streams matter for file uploads

```typescript
// Naive - loads the entire file into memory before doing anything with it
const buffer = await fs.promises.readFile(uploadedFilePath);
await uploadToS3(buffer);

// Streamed - constant memory regardless of file size
const readStream = fs.createReadStream(uploadedFilePath);
await pipeline(readStream, s3UploadStream);
```

For VetApp-style file uploads (veterinary records, documents, images), streaming avoids the classic failure mode of large uploads spiking memory and potentially crashing the process under concurrent load - a 50MB file buffered fully in memory for 20 concurrent uploads is 1GB+ of RAM just sitting there.

### Backpressure

If a writable destination is slower than the readable source (e.g. writing to a slow disk/network vs reading a fast local file), naive manual piping without respecting backpressure signals can balloon memory as unconsumed data queues up. `.pipe()` and `stream.pipeline()` handle this automatically by pausing the readable side when the writable side's internal buffer is full.

### `pipe()` vs `pipeline()`

```typescript
// pipe() - errors on either stream do NOT automatically propagate/cleanup the other side
readStream.pipe(writeStream); // must manually listen for 'error' on both

// pipeline() - properly propagates errors and cleans up (destroys) all streams on failure
import { pipeline } from 'node:stream/promises';
await pipeline(readStream, transformStream, writeStream);
```

### Interview questions

**Q: Why use streams for file uploads instead of just reading the whole file into a buffer?**
> "Memory. Buffering a whole file means memory usage scales with file size times concurrent uploads - a handful of large concurrent uploads can spike memory dramatically and risk an OOM crash. Streaming processes data in chunks with constant memory overhead regardless of file size, and it lets you start forwarding data (e.g. to S3) before the whole file has even finished uploading."

**Q: What's wrong with `readStream.pipe(writeStream)` on its own, error-handling-wise?**
> "`pipe()` doesn't automatically forward errors between the streams or clean up (destroy) the other side if one errors - you can end up with dangling file handles or a hung process if you don't attach your own `error` listeners on each stream. `stream.pipeline()` (or its promise-based version) handles error propagation and cleanup correctly out of the box, which is why I prefer it for anything beyond a quick script."

---
