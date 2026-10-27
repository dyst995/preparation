# NODE04 — Streams

Node.js 20/22. Questions NODE-151–NODE-200.

These questions cover `Readable`, `Writable`, `Duplex`, and `Transform`, `objectMode`, flowing and paused modes, `pipe` versus `pipeline`, backpressure and `highWaterMark`, error and destroy propagation, async iteration, `cork`, encodings, `fs` and HTTP streams, `compose`, and memory problems from wrong buffering. Event-loop phases are NODE02 and parallelism is NODE03; this section assumes both and touches them only where streams meet them (for example the libuv pool behind `zlib`).

A stream moves data in chunks with bounded memory. The producer must respect `write()` returning `false`, and errors do not travel on their own across `.pipe()`. Prefer `pipeline` from `node:stream/promises` in production code.

### NODE-151 — The four stream types

**Difficulty:** Junior

**Category:** Fundamentals

**Question:**

What are the four stream types in Node.js, and when would you use each?

**Answer:**

`Readable` is a source (file, HTTP request, `process.stdin`). `Writable` is a sink (file, HTTP response, `process.stdout`). `Duplex` has independent read and write sides (`net.Socket`). `Transform` is a Duplex whose output is computed from its input (`zlib.createGzip()`). All extend `EventEmitter`. Use streams to process data incrementally with bounded memory instead of loading whole payloads.

**Follow-up:**

Is a `Transform` just a `Duplex`?

Answer: A Transform is a Duplex subclass where the readable side is derived from the writable side. In a plain Duplex such as a socket, what you write and what you read are unrelated.

### NODE-152 — Flowing vs paused Readable

**Difficulty:** Junior

**Category:** Readable modes

**Question:**

Explain flowing and paused mode of a Readable and what switches between them.

**Answer:**

A Readable starts paused. It becomes flowing when you attach a `'data'` listener, call `.resume()`, or call `.pipe()`. In flowing mode chunks are pushed to listeners as fast as they are produced. In paused mode you pull with `.read()` after `'readable'`. `readable.readableFlowing` is `null` (no consumer yet), `true`, or `false` (explicitly paused).

**Follow-up:**

What happens to data produced before a `'data'` listener is attached?

Answer: Nothing is emitted while the stream has no consumer; chunks wait in the internal buffer up to `highWaterMark`, then the source is told to stop producing. Attaching `'data'` later starts delivery from the buffer.

### NODE-153 — objectMode

**Difficulty:** Intermediate

**Category:** objectMode

**Question:**

What is `objectMode`, and what changes when you enable it?

**Answer:**

With `objectMode: true` a stream carries arbitrary JavaScript values instead of Buffers or strings. `null` is not allowed as a value because it signals end. `highWaterMark` counts objects (default 16), not bytes. Each `push()` or `write()` is one unit; chunks are never merged or split. Use it for parsed records, rows, or events between processing stages.

**Follow-up:**

Can the two sides of a Transform differ in mode?

Answer: Yes. `readableObjectMode` and `writableObjectMode` are separate options, so a parser can take bytes in and emit objects out.

### NODE-154 — highWaterMark and its defaults

**Difficulty:** Intermediate

**Category:** Backpressure

**Question:**

What is `highWaterMark`, and what are the byte defaults in Node 20 versus Node 22?

**Answer:**

It is the internal buffer threshold. When buffered data reaches it, `write()` returns `false` and `push()` returns `false`. It is a signal, not a hard cap. In Node 20 the default for byte streams is 16 KiB. In Node 22 it is 64 KiB on non-Windows platforms; Windows stays at 16 KiB. `objectMode` remains 16 objects. `fs.createReadStream` already used 64 KiB.

**Trade-offs:**

A larger value reduces syscalls and improves throughput but costs memory per concurrent stream. With thousands of connections, 64 KiB each adds up.

**Follow-up:**

Does hitting `highWaterMark` reject the chunk?

Answer: No. The chunk is accepted and buffered; `false` only asks the producer to pause until `'drain'`. Ignoring it keeps buffering without a limit.

### NODE-155 — Backpressure

**Difficulty:** Intermediate

**Category:** Backpressure

**Question:**

What is backpressure, and how does Node implement it?

**Answer:**

Backpressure is the consumer telling the producer to slow down. When `writable.write(chunk)` returns `false`, the producer must stop until `'drain'` is emitted. `pipe()` and `pipeline()` do this automatically by pausing the source and resuming on `'drain'`. Without it, the writable buffer grows until memory runs out when the producer is faster than the sink.

**Follow-up:**

What exactly makes `write()` return `false`?

Answer: The writable's buffered length reaching or exceeding its `writableHighWaterMark`. The write itself still succeeds.

### NODE-156 — pipe vs pipeline

**Difficulty:** Intermediate

**Category:** pipe and pipeline

**Question:**

What are the differences between `.pipe()` and `stream.pipeline()`?

**Answer:**

`pipe()` handles backpressure but not errors. If a destination fails, the source is only unpiped and stays open, leaking descriptors or sockets, and every stream needs its own `'error'` handler. `pipeline()` forwards errors, destroys all streams on failure or completion, and reports once through a callback or a promise. Prefer `pipeline` in production.

**Follow-up:**

If the middle Transform throws, which streams are destroyed?

Answer: All of them: the source, the Transform, and the destination. The callback or promise receives the first error.

### NODE-157 — pipeline from stream/promises

**Difficulty:** Intermediate

**Category:** pipe and pipeline

**Question:**

How do you use `pipeline` from `node:stream/promises`, and what can it accept?

**Answer:**

`await pipeline(src, ...stages, dest)` returns a Promise that resolves when the last stream finishes and rejects on the first error. Middle stages can be Transforms or async generator functions. The last argument may be an options object with `signal` for cancellation. Cleanup of every stream is automatic.

**Code:**

```js
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(createReadStream('in.log'), createGzip(), createWriteStream('in.log.gz'));
```

**Follow-up:**

Why prefer `await pipeline` over the callback form?

Answer: Errors surface in a normal `try/catch`, there is no risk of calling the callback twice in handler code, and flow reads linearly with other async steps.

### NODE-158 — finished()

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

What does `finished()` do, and when do you need it instead of `pipeline`?

**Answer:**

`finished(stream, cb)`, or the promise version in `stream/promises`, fires when a stream is no longer readable or writable: ended, errored, or closed early. It reports `ERR_STREAM_PREMATURE_CLOSE` if the stream is destroyed before a clean end. Use it for cleanup when you cannot wrap the flow in `pipeline`, for example around an HTTP response written by a framework.

**Follow-up:**

Why keep the cleanup function that `finished` returns?

Answer: Calling it removes the listeners `finished` added. In long-lived streams, forgetting it leaves listeners attached and can trigger `MaxListenersExceededWarning`.

### NODE-159 — destroy and error propagation

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

How do `destroy()` and error propagation work on a stream?

**Answer:**

`stream.destroy(err?)` tears the stream down: it runs `_destroy`, releases resources, emits `'error'` if an error was given, then `'close'`. Afterwards writes fail and reads end. With `autoDestroy: true` (default) a stream destroys itself after `'end'`, `'finish'`, or an error. `destroy` does not touch piped peers; `pipeline` does that propagation.

**Follow-up:**

What should `_destroy(err, cb)` do?

Answer: Close underlying resources such as a file descriptor, socket, or DB cursor, then call `cb(err)` exactly once so the error continues to propagate.

### NODE-160 — for await over a stream

**Difficulty:** Intermediate

**Category:** Async iteration

**Question:**

How do you consume a Readable with `for await...of`, and how does it relate to backpressure?

**Answer:**

Readable implements `Symbol.asyncIterator`. Each iteration pulls the next chunk only after the previous loop body finished, so backpressure is natural. Stream errors are thrown inside the loop, so `try/catch` works. Leaving the loop early with `break`, `return`, or a throw destroys the stream by default.

**Code:**

```js
try {
  for await (const chunk of readable) {
    await handle(chunk);
  }
} catch (err) {
  // stream error or handle() failure
}
```

**Follow-up:**

What does a slow body do to the stream?

Answer: The internal buffer fills to `highWaterMark`, then the source is paused until the loop catches up. Memory stays bounded.

### NODE-161 — Readable.from

**Difficulty:** Junior

**Category:** Readable

**Question:**

What is `Readable.from()`, and what is a common gotcha?

**Answer:**

It creates a Readable from an iterable or async iterable such as an array, generator, or async generator: `Readable.from(asyncGen())`. It defaults to `objectMode: true`. It is handy for tests and for turning generators into pipeline sources. Pass `{ objectMode: false }` when the items are strings or Buffers that should be treated as bytes.

**Follow-up:**

What does `Readable.from('abc')` emit?

Answer: A single chunk containing the whole string `'abc'`, not one chunk per character. Strings and Buffers are special-cased so they are not iterated as characters or bytes.

### NODE-162 — push(null)

**Difficulty:** Junior

**Category:** Readable

**Question:**

What does `push(null)` mean in a custom Readable?

**Answer:**

`null` signals end of data. Already buffered data is still delivered, then `'end'` is emitted. Pushing after EOF raises `ERR_STREAM_PUSH_AFTER_EOF`. In `objectMode`, `null` therefore cannot be used as a data value. If you never push `null`, consumers wait forever and `pipeline` never resolves.

**Follow-up:**

How would you notice a missing `push(null)` in production?

Answer: Requests or jobs hang with no error, and the stream never emits `'end'` or `'close'`. A timeout or `AbortSignal` on the pipeline exposes it.

### NODE-163 — Implementing _read

**Difficulty:** Intermediate

**Category:** Readable

**Question:**

How do you implement `_read()` correctly for an async source?

**Answer:**

`_read(size)` is called when the consumer wants more data. Fetch or generate data, call `this.push(chunk)`, and push `null` at the end. If `push()` returns `false`, stop until `_read` is called again. For async sources, keep a flag so you do not start a second fetch while one is in flight, and call `this.destroy(err)` on failure rather than throwing.

**Follow-up:**

Why can `_read` be called again before an async fetch finished?

Answer: Node calls it whenever the buffer is below `highWaterMark` and `push` has not satisfied the request. A guard such as `if (this.reading) return` prevents overlapping fetches and reordering.

### NODE-164 — Implementing _write

**Difficulty:** Intermediate

**Category:** Writable

**Question:**

How do you implement a Writable with `_write()`, and what must the callback do?

**Answer:**

`_write(chunk, encoding, callback)` processes one chunk and must call `callback()` or `callback(err)` exactly once. Not calling it stalls the stream; calling it twice is an error. By default chunks arrive as Buffers because `decodeStrings` is `true`. For simple cases, `new Writable({ write(chunk, enc, cb) { ... } })` is enough.

**Follow-up:**

What happens to later `write()` calls while a callback is pending?

Answer: They are queued in the writable buffer and processed in order after the pending one completes. Once the queue passes `highWaterMark`, `write()` returns `false`.

### NODE-165 — _transform and _flush

**Difficulty:** Intermediate

**Category:** Transform

**Question:**

How do `_transform` and `_flush` work in a Transform?

**Answer:**

`_transform(chunk, enc, cb)` receives input, calls `this.push(out)` zero or more times, then `cb()`, or `cb(null, out)` as shorthand. `_flush(cb)` runs after all input has been consumed and before `'end'`, so you can emit remaining state: the last partial line, a checksum trailer, or buffered tail bytes.

**Follow-up:**

Why is a line-splitting Transform wrong without `_flush`?

Answer: The final line often has no trailing newline and sits in the carry-over buffer. Without `_flush` that last record is silently dropped.

### NODE-166 — Duplex vs Transform

**Difficulty:** Intermediate

**Category:** Duplex and Transform

**Question:**

Give a concrete example of a Duplex and of a Transform, and say how you implement each.

**Answer:**

A TCP `net.Socket` is a Duplex: it reads what the peer sends and writes what you send, with no relation between the two sides. Gzip, encryption, and parsers are Transforms, where writes produce reads. Implement a Duplex with both `_read` and `_write`; implement a Transform with `_transform` (and optionally `_flush`).

**Follow-up:**

What is `PassThrough` for?

Answer: It is a Transform that outputs its input unchanged. It is used as a tap point, to fork or observe a stream, or as a placeholder in a pipeline.

### NODE-167 — cork and uncork

**Difficulty:** Senior

**Category:** Writable

**Question:**

What do `cork()` and `uncork()` do, and when do they help?

**Answer:**

`cork()` makes the Writable buffer all subsequent writes in memory. `uncork()` flushes them, using `_writev` if implemented so they go out as one batch. It helps with many small writes, such as header lines followed by a body on a socket. Calls nest: each `cork()` needs a matching `uncork()`. A common idiom is `process.nextTick(() => stream.uncork())`.

**Follow-up:**

What happens to corked data if you call `end()`?

Answer: `end()` uncorks fully and flushes the pending writes before finishing. `destroy()`, however, discards buffered data without writing it.

### NODE-168 — _writev

**Difficulty:** Senior

**Category:** Writable

**Question:**

What is `_writev`, and why would you implement it?

**Answer:**

`_writev(chunks, cb)` receives an array of `{ chunk, encoding }` entries and handles them in one operation, such as one multi-row DB insert or one `writev` syscall. Node uses it when writes accumulated, either because of `cork()` or because earlier writes were still in progress. Ordering is preserved within the array.

**Follow-up:**

Do you have to implement `_write` as well?

Answer: Yes, `_write` is still needed as a fallback when only one chunk is pending. Many implementations make `_write` call `_writev` with a one-element array.

### NODE-169 — Buffer vs string encoding

**Difficulty:** Intermediate

**Category:** Encoding

**Question:**

How do encodings behave in streams, and what is the multi-byte pitfall?

**Answer:**

Readables emit Buffers by default. `setEncoding('utf8')` or the `encoding` option makes them emit strings through an internal `StringDecoder`, which correctly stitches multi-byte characters split across chunks. Calling `chunk.toString()` on each Buffer can corrupt a character that straddles a boundary and produce `�`.

**Follow-up:**

Why is `Buffer.concat(chunks).toString()` safer than `str += chunk`?

Answer: With `str += chunk` on Buffers, each chunk is decoded separately and boundary characters break. Concatenating bytes first and decoding once, or using `setEncoding`, keeps characters intact.

### NODE-170 — fs.createReadStream options

**Difficulty:** Intermediate

**Category:** fs streams

**Question:**

What are the key options of `fs.createReadStream`, and how do its errors surface?

**Answer:**

`start` and `end` (inclusive byte offsets, used for HTTP Range), `highWaterMark` (64 KiB default), `encoding`, `flags`, `fd`, `autoClose`, and `signal`. The file opens lazily and the stream emits `'open'`, `'ready'`, `'data'`, `'end'`, `'close'`. Failures such as `ENOENT` arrive asynchronously as `'error'` events, not as thrown exceptions.

**Follow-up:**

How do you serve a byte range safely?

Answer: Parse and validate the `Range` header against the file size, answer 416 for unsatisfiable ranges, then set `start`/`end` and `Content-Range`. Use `pipeline` so a client abort closes the file.

### NODE-171 — fs.createWriteStream, finish vs close

**Difficulty:** Intermediate

**Category:** fs streams

**Question:**

What do `fs.createWriteStream` flags control, and how do `'finish'` and `'close'` differ?

**Answer:**

Default flag `'w'` truncates; `'a'` appends; `'wx'` fails if the file exists. `'finish'` fires after `end()` once all data has been handed to the OS. `'close'` fires after the file descriptor is closed. Wait for `'close'`, or use `pipeline` or `finished`, before reading the file back, renaming it, or deleting it.

**Follow-up:**

Does `'finish'` mean data is on disk?

Answer: No. It means the OS accepted the writes; they may still be in page cache. For durability, call `fsync` (`fs.fsync` or `filehandle.sync()`) before relying on it.

### NODE-172 — Request as Readable

**Difficulty:** Intermediate

**Category:** HTTP

**Question:**

Why is `http.IncomingMessage` a Readable, and what does that imply for handlers?

**Answer:**

The request body arrives in chunks from the socket, so `req` is a Readable. You must consume it with `for await`, `pipe`, or `resume()`, or the connection can stall. Never buffer an unbounded body; enforce a size limit and answer 413. If the client disconnects, `req` emits `'close'`, and consumers see an abort error.

**Follow-up:**

What if the handler responds without reading the body?

Answer: For small remaining bodies Node may drain them; for large ones the connection can be closed or left in a bad keep-alive state. Explicitly `req.resume()` or destroy the request to avoid stalls.

### NODE-173 — Streaming a response

**Difficulty:** Intermediate

**Category:** HTTP

**Question:**

`res` is a Writable. How do you stream a large file response correctly?

**Answer:**

Set headers first, then `pipeline(fs.createReadStream(path), res, cb)`. Without `Content-Length`, Node uses chunked transfer encoding. Backpressure flows from the client's socket to the file stream. If the client disconnects, the pipeline fails with premature close and destroys the file stream, freeing the descriptor. Buffering with `readFile` then `res.end(data)` costs file-size memory per concurrent request.

**Follow-up:**

What does 1,000 concurrent 500 MB downloads cost each way?

Answer: With `readFile` it needs about 500 GB of heap or Buffer memory and will fail. Streaming holds roughly 64 KiB per request plus socket buffers.

### NODE-174 — Proxying an upload

**Difficulty:** Senior

**Category:** HTTP

**Question:**

How would you proxy an incoming upload to another service using streams?

**Answer:**

Open an outbound `http.request`, or `fetch` with a stream body, and `pipeline(req, upstreamReq)`. Forward relevant headers, then pipeline the upstream response into `res`. Memory stays bounded and backpressure flows end to end. Abort the upstream when the client leaves, and handle errors on both directions. Validate size limits before forwarding.

**Follow-up:**

Why does `fetch` need `duplex: 'half'` with a stream body?

Answer: Undici requires it for request bodies that are streams, meaning the request body is sent fully before the response is read. Without it, `fetch` throws.

### NODE-175 — Premature close

**Difficulty:** Intermediate

**Category:** Error handling

**Question:**

What is a premature close, and how does it surface?

**Answer:**

It happens when a stream is destroyed, or its peer disconnects, before a normal `end` or `finish`. `pipeline` and `finished` fail with `ERR_STREAM_PREMATURE_CLOSE`. Common causes are a client aborting a download, a socket reset, or `break` inside `for await`. It is often expected and should be logged at low severity rather than paging someone.

**Follow-up:**

How do you tell a client abort from a server fault?

Answer: Check `err.code === 'ERR_STREAM_PREMATURE_CLOSE'` together with `req.destroyed` or the response's `writableEnded`. Treat it as a fault only if the server side failed first.

### NODE-176 — pipe error-handling pitfalls

**Difficulty:** Senior

**Category:** Error handling

**Question:**

What are the main error-handling pitfalls of `.pipe()`?

**Answer:**

Errors do not propagate, so each stream needs its own `'error'` handler. On destination error the source is only unpiped, not destroyed, which leaks fds and sockets. In `a.pipe(b).pipe(c)` the return value is the last stream, so developers attach a handler only there. A missing handler becomes an uncaught exception. `pipeline` avoids all of these.

**Code:**

```js
// before
a.pipe(b).pipe(c);

// after
try {
  await pipeline(a, b, c);
} catch (err) {
  if (!res.headersSent) res.statusCode = 500;
  res.end();
}
```

**Follow-up:**

What if headers were already sent?

Answer: You cannot change the status code. Destroy the response so the client sees a broken stream rather than a truncated body that looks complete.

### NODE-177 — Unhandled stream error

**Difficulty:** Junior

**Category:** Error handling

**Question:**

What happens when a stream emits `'error'` and no listener is attached?

**Answer:**

`EventEmitter` throws it as an uncaught exception, which crashes the process unless an `uncaughtException` handler exists. Always attach `'error'` listeners, or use `pipeline` or `finished`. After `'error'` the stream is destroyed, so do not expect `'end'` or `'finish'` afterwards.

**Follow-up:**

Why does `try/catch` around `.pipe()` not help?

Answer: Stream errors are emitted later, asynchronously, outside the original call stack. Only `await pipeline(...)` turns them into a rejection you can catch.

### NODE-178 — Memory blowup from wrong buffering

**Difficulty:** Senior

**Category:** Memory

**Question:**

How does wrong buffering blow up memory in stream code, and how do you fix it?

**Answer:**

Collecting every chunk into an array or string, calling `readFile` and `JSON.parse` on huge inputs, or ignoring backpressure in producers makes memory grow with input size or with the producer-consumer speed gap. Fix it by processing incrementally through `pipeline`, putting limits on accumulated bytes, and respecting `write()` return values.

**Follow-up:**

How would you diagnose it?

Answer: Watch RSS versus heap used (Buffers live outside the heap), and sample `readableLength` and `writableLength` on suspect streams. Growing lengths point to a missing backpressure handoff.

### NODE-179 — Ignoring write() return value

**Difficulty:** Senior

**Category:** Backpressure

**Question:**

What is wrong with writing in a loop and ignoring the return value of `write()`?

**Answer:**

`write()` never blocks. A loop such as `for (...) w.write(row)` queues everything in memory when the sink is slower than the loop. The correct pattern is `if (!w.write(x)) await once(w, 'drain')`. Better still, generate data from a Readable or async generator and send it through `pipeline`, which does this for you.

**Code:**

```js
import { once } from 'node:events';

async function writeAll(w, iterable) {
  for (const chunk of iterable) {
    if (!w.write(chunk)) await once(w, 'drain');
  }
  w.end();
}
```

**Follow-up:**

What if the writable errors while waiting for `'drain'`?

Answer: `events.once` rejects when `'error'` fires, so the `await` throws and the loop stops. A `'close'` without `'drain'` would hang, so guard with an `AbortSignal` or check `w.destroyed`.

### NODE-180 — stream.compose

**Difficulty:** Staff

**Category:** Composition

**Question:**

What is `stream.compose()`, and how stable is it?

**Answer:**

`compose(...streams)` joins streams or async generator functions into one Duplex: the first stage is the writable side and the last is the readable side. It propagates errors and destroys all parts like `pipeline`. It lets you export a reusable processing step as a single stream. The API is still marked experimental in Node 20 and 22, so check the stability index before depending on it.

**Follow-up:**

How does it differ from `pipeline`?

Answer: `pipeline` wires a complete source-to-sink flow and runs it. `compose` returns a stream that is itself a stage, to be written into or read from or placed inside another pipeline.

### NODE-181 — Uppercase Transform

**Difficulty:** Junior

**Category:** Transform examples

**Question:**

Write an uppercase Transform and name its UTF-8 caveat.

**Answer:**

Create a Transform whose `transform` callback converts the chunk to upper case and passes it on. This is fine for ASCII demos. With multi-byte UTF-8, converting each Buffer chunk separately can corrupt characters split across chunks. Decode with `setEncoding('utf8')` on the input side, or use `StringDecoder`, before changing text.

**Code:**

```js
import { Transform } from 'node:stream';

const upper = new Transform({
  decodeStrings: false,
  transform(chunk, enc, cb) {
    cb(null, String(chunk).toUpperCase());
  },
});
```

**Follow-up:**

How would you write the same stage as an async generator?

Answer: `async function* (src) { for await (const c of src) yield String(c).toUpperCase(); }` placed in `pipeline`. Set the source to a string encoding, or decode inside the generator.

### NODE-182 — NDJSON parsing Transform

**Difficulty:** Senior

**Category:** Transform examples

**Question:**

How do you parse newline-delimited JSON from a byte stream with a Transform?

**Answer:**

Keep a string `tail`. For each chunk, `const lines = (tail + chunk).split('\n'); tail = lines.pop();`, then push `JSON.parse(line)` for each non-empty line. In `_flush`, parse any remaining `tail`. Set `readableObjectMode: true` so the output side emits objects while the input side stays bytes, and decode chunks with `StringDecoder` to avoid breaking multi-byte characters.

**Follow-up:**

How do you handle a malformed line?

Answer: Decide per use case: fail the stream with `cb(err)`, skip and count it, or route it to a dead-letter sink. Include the line number in the error for debugging.

### NODE-183 — Async generators as pipeline stages

**Difficulty:** Intermediate

**Category:** Transform examples

**Question:**

Can you use async generators as `pipeline` stages, and why would you?

**Answer:**

Yes. The generator receives the previous stage as an async iterable and yields output. Backpressure and error propagation come from the iteration protocol, and `try/finally` gives clean teardown. It is easier to read than a Transform subclass for stateless or lightly stateful steps. A native Transform can be somewhat faster in very hot paths.

**Code:**

```js
await pipeline(
  source,
  async function* (chunks) {
    for await (const c of chunks) yield transform(c);
  },
  dest
);
```

**Follow-up:**

Where does the generator's `finally` run on failure?

Answer: When the pipeline is destroyed, the generator's `return()` is called, so its `finally` block runs and can release resources.

### NODE-184 — Readable operators

**Difficulty:** Senior

**Category:** Readable operators

**Question:**

What do `Readable.prototype.map`, `filter`, and `toArray` offer, and what are the caveats?

**Answer:**

They are iterator-helper style operators on Readable: `map`, `filter`, `forEach`, `take`, `drop`, `flatMap`, `reduce`, and `toArray`. They return new Readables or Promises. `map` accepts a `concurrency` option for parallel async mapping. They were experimental in Node 20 and the API may change, so check the stability index for your version. `toArray()` buffers everything, so use it only on bounded input.

**Follow-up:**

How does `concurrency` in `map` affect order and memory?

Answer: Output order is preserved even when work completes out of order, so one slow item can hold finished results in memory. Higher concurrency increases peak buffered items.

### NODE-185 — stream/promises vs promisify

**Difficulty:** Junior

**Category:** pipe and pipeline

**Question:**

`node:stream/promises` or `util.promisify(stream.pipeline)`: which do you use?

**Answer:**

Use `node:stream/promises`. It is the native promise API for `pipeline` and `finished`, with `signal` support in options. `util.promisify(stream.pipeline)` also works because `pipeline` has a custom promisify hook that points at the same implementation, but the explicit import is clearer and the recommended style.

**Follow-up:**

How does the callback `pipeline` know the last argument is a callback?

Answer: If the final argument is a function and not a stream or iterable stage, it is treated as the completion callback. Async generator functions in the middle are identified by their position.

### NODE-186 — Cancelling a pipeline

**Difficulty:** Senior

**Category:** Cancellation

**Question:**

How do you cancel a pipeline with `AbortSignal`?

**Answer:**

Pass `{ signal }` as the last argument: `await pipeline(a, b, c, { signal })`. On abort all streams are destroyed and the promise rejects with `AbortError`. `fs.createReadStream({ signal })` and `stream.addAbortSignal(signal, stream)` offer the same for individual streams. Use it for timeouts and for client disconnects.

**Follow-up:**

How do you combine a timeout and a client abort?

Answer: `AbortSignal.any([AbortSignal.timeout(ms), clientSignal])` gives one signal that fires on whichever happens first. `AbortSignal.any` is available in Node 20.3 and later.

### NODE-187 — Node streams vs Web Streams

**Difficulty:** Senior

**Category:** Web Streams

**Question:**

How do Node streams and Web Streams differ, and how do you interoperate?

**Answer:**

Web Streams (`ReadableStream`, `WritableStream`, `TransformStream`) follow the WHATWG standard, used by `fetch` bodies and portable across browsers, Deno, and workers. Node streams have the larger ecosystem (fs, net, zlib). Convert with `Readable.toWeb()`, `Readable.fromWeb()`, `Writable.toWeb()`, and `Writable.fromWeb()`. Both support async iteration.

**Code:**

```js
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const res = await fetch(url);
await pipeline(Readable.fromWeb(res.body), createWriteStream('out.bin'));
```

**Follow-up:**

Why convert instead of iterating `res.body` directly?

Answer: You can iterate directly, but converting lets you use `pipeline` with Node writables and keeps one cleanup and error model.

### NODE-188 — end, finish, close

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

Explain `'end'`, `'finish'`, and `'close'`.

**Answer:**

`'end'` is a Readable event: no more data will be delivered. It is not emitted if the stream is never consumed. `'finish'` is a Writable event: after `end()`, all data has been flushed to the underlying system. `'close'` means the stream and its resources, such as a fd or socket, are released; it follows destroy when `emitClose` is `true`. A Duplex can emit all three.

**Follow-up:**

Which event do you wait for before deleting a temp file you just wrote?

Answer: `'close'`, because only then is the file descriptor closed. On most systems deleting earlier works, but on Windows it can fail, and `pipeline` waits for the correct moment anyway.

### NODE-189 — autoDestroy, emitClose, autoClose

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

What do `autoDestroy`, `emitClose`, and `autoClose` do?

**Answer:**

`autoDestroy` (default `true` since Node 14) destroys the stream automatically after `'end'`, `'finish'`, or an error. `emitClose` (default `true`) emits `'close'` after destroy. `autoClose` is specific to `fs` streams and closes the fd on end or error. If you set `autoDestroy: false`, you must call `destroy()` yourself or you leak resources.

**Follow-up:**

When would you ever disable `autoDestroy`?

Answer: Rarely: when you reuse a stream after `'end'`, for example a custom Duplex that has to be reset. For normal streams, leave it on.

### NODE-190 — 'readable' and read() vs 'data'

**Difficulty:** Senior

**Category:** Readable modes

**Question:**

How do `'readable'` plus `read()` differ from `'data'`?

**Answer:**

`'data'` pushes chunks to you in flowing mode. `'readable'` signals that data or EOF is available, and you pull with `read(n)` in a loop until it returns `null`. `read(size)` can return exactly `size` bytes when available, which suits binary framing. If both are attached, `'readable'` takes precedence and `'data'` flow does not start until you call `read()`.

**Follow-up:**

How would you parse a length-prefixed binary frame?

Answer: `read(4)` for the length header, then `read(len)` for the payload. If `read` returns `null`, wait for the next `'readable'` and retry. Use `unshift` to push back bytes if you over-read.

### NODE-191 — Mixing consumption styles

**Difficulty:** Senior

**Category:** Readable modes

**Question:**

What goes wrong if you mix `'data'`, `'readable'`, `pipe`, and async iteration on one stream?

**Answer:**

They all consume the same stream and interfere. Adding `'readable'` stops automatic flowing; removing it may or may not resume. Async iteration uses `read()` internally. Mixed styles lose chunks, hang, or process data twice. Pick one consumption style per stream and document it in the function that owns it.

**Follow-up:**

How do you debug a stalled stream?

Answer: Log `readableFlowing`, `readableLength`, `isPaused()`, and `listenerCount('data')` / `listenerCount('readable')`. The combination usually reveals which consumer paused it.

### NODE-192 — pause, resume, unpipe

**Difficulty:** Senior

**Category:** pipe and pipeline

**Question:**

How do `pause()`, `resume()`, and `unpipe()` interact with `pipe`?

**Answer:**

`pipe` calls `pause()` on the source when `dest.write()` returns `false`, and `resume()` on `'drain'`. A manual `pause()` can be overridden by the next `'drain'`. `unpipe(dest)` detaches the destination, and with no remaining pipes the source returns to paused state. Data already buffered stays in the source.

**Follow-up:**

After `unpipe()`, what must you do to avoid stuck data?

Answer: Attach a new consumer or call `resume()`, otherwise the stream stays paused and holds its buffered data. If you want to discard it, `resume()` with no listener or `destroy()`.

### NODE-193 — Separate high-water marks on a Transform

**Difficulty:** Senior

**Category:** Backpressure

**Question:**

How do `readableHighWaterMark` and `writableHighWaterMark` work on a Transform?

**Answer:**

A Transform has two buffers. `highWaterMark` sets both; `readableHighWaterMark` and `writableHighWaterMark` set each independently. Different values help when output expands (decompression) or when one side is in `objectMode`, for example bytes in with `readableObjectMode: true` emitting objects. Worst-case memory for a chain is roughly the sum of both buffers over all stages.

**Follow-up:**

How much memory could a chain of N Transforms hold with defaults?

Answer: About N × (readable + writable high-water marks), so around 128 KiB per stage in Node 22 on Linux, plus the source and sink buffers. It is bounded, unlike unmanaged buffering.

### NODE-194 — Gzip with streams and the libuv pool

**Difficulty:** Senior

**Category:** zlib

**Question:**

How do you gzip a file with streams, and what happens under heavy parallel use?

**Answer:**

`await pipeline(createReadStream(src), zlib.createGzip(), createWriteStream(dst))`; decompress with `createGunzip()`. Memory stays bounded. Async zlib work runs on libuv's threadpool, which has four threads by default (`UV_THREADPOOL_SIZE`), so many parallel compressions queue and can also delay `fs` and `dns.lookup`. `zlib.createZstdCompress` was added only in later 22.x releases (22.15) as experimental, so check your exact release.

**Follow-up:**

Where does a corrupt gzip input fail?

Answer: The Gunzip stream emits an error such as `Z_DATA_ERROR`. `pipeline` destroys the other streams and rejects, so descriptors are closed.

### NODE-195 — process.stdin and stdout

**Difficulty:** Intermediate

**Category:** Process streams

**Question:**

What should you know about `process.stdin` and `process.stdout` as streams?

**Answer:**

`stdin` is a Readable; `stdout` and `stderr` are Writables. Whether writes are synchronous depends on the target and platform: files are synchronous, TTYs differ between POSIX and Windows, and pipes may be asynchronous. So calling `process.exit()` right after a big write can truncate output. Prefer letting the process end naturally, and use `pipeline(process.stdin, transform, process.stdout)` for filters.

**Follow-up:**

`pipeline` destroys `process.stdout` at the end. How do you avoid that?

Answer: Pass `{ end: false }` where supported, or wrap the last stage in a `PassThrough` that you pipe manually with `{ end: false }`. Alternatively use an async generator as the last stage and write with `process.stdout.write`.

### NODE-196 — _final

**Difficulty:** Senior

**Category:** Writable

**Question:**

What is `_final()` in a Writable, and when do you use it?

**Answer:**

`_final(cb)` runs after `end()` and after all pending writes completed, but before `'finish'`. Use it to flush buffered data, commit a transaction, or close a connection. An error passed to `cb` emits `'error'` and no `'finish'`. It is the Writable counterpart of Transform `_flush`.

**Follow-up:**

How do you ensure a batching DB writer persists its last partial batch?

Answer: Collect rows in an array in `_write`, insert when the batch is full, and in `_final` insert whatever remains before calling `cb`. Without that, the last rows are lost.

### NODE-197 — Duplex.from

**Difficulty:** Staff

**Category:** Composition

**Question:**

What is `Duplex.from()` used for?

**Answer:**

It converts several shapes into a Duplex: a `{ readable, writable }` pair, an async generator function, a Promise, or a Web Streams pair. It simplifies wrapping, for example turning an async function into a stage for `pipeline` or `compose`. It forwards destroy and errors to the wrapped parts.

**Follow-up:**

How does it differ from subclassing Transform?

Answer: It is less code and uses iteration semantics, but you lose fine control over `_flush`, per-side high-water marks, and chunk-level callbacks.

### NODE-198 — break inside for await

**Difficulty:** Intermediate

**Category:** Async iteration

**Question:**

What happens to a stream when you `break` out of `for await`?

**Answer:**

The iterator's `return()` is called and the stream is destroyed by default (`destroyOnReturn: true`), releasing resources such as file descriptors. If you want to keep using it afterwards, create the iterator with `readable.iterator({ destroyOnReturn: false })`. A `break` after reading a header from a stream you still need to pipe is a common bug.

**Follow-up:**

What do other consumers of that stream see?

Answer: They see a premature close or abort-type error once it is destroyed, since the stream will not end normally.

### NODE-199 — Consuming a stream twice

**Difficulty:** Staff

**Category:** Fan-out

**Question:**

Can a stream be consumed twice? How do you fork one?

**Answer:**

No; once data is consumed it is gone. To fan out, pipe the source into several `PassThrough` streams. The slowest consumer sets the speed because `pipe` pauses on any `false`, and an unconsumed branch stalls everyone. Alternatives: buffer to disk and read twice, or use Web `ReadableStream.tee()`, which buffers without limit if branches are read at different speeds.

**Trade-offs:**

Fan-out saves a second read of the source but ties the consumers' health together. A failing branch must not silently stall the others, so wrap with `pipeline` and abort all on any error.

**Follow-up:**

How would you hash a file and upload it from a single read?

Answer: Pipe the file into a hash `PassThrough`-style tap and the upload simultaneously, for example with a Transform that updates `crypto.createHash` while forwarding chunks. If the upload fails, the pipeline aborts and the partial hash is discarded.

### NODE-200 — Reading a body to JSON safely

**Difficulty:** Senior

**Category:** HTTP

**Question:**

How do you safely read a request body into JSON, and what is `node:stream/consumers`?

**Answer:**

`node:stream/consumers` provides `text`, `json`, `buffer`, `arrayBuffer`, and `blob`, which consume a whole stream: `const body = await json(req)`. They buffer everything, so add a size limit first. Check `Content-Length` and wrap the stream in a counting Transform that errors with 413 over the cap. For very large payloads, use an incremental parser instead of building one big value.

**Follow-up:**

How do you also defend against slow uploads?

Answer: Set server-level `headersTimeout` and `requestTimeout`, plus an application timeout or `AbortSignal` on the body read. Close connections that send bytes too slowly.
