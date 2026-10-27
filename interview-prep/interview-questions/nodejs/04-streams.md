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

A `Readable` is a source of data, such as a file, an HTTP request, or `process.stdin`. A `Writable` is a destination, such as a file, an HTTP response, or `process.stdout`. A `Duplex` has a read side and a write side that work independently; `net.Socket` is an example. A `Transform` is a Duplex whose output is computed from its input, like `zlib.createGzip()`. Use streams to process data piece by piece instead of loading everything into memory.

**Follow-up:**

Is a `Transform` just a `Duplex`?

Answer: A Transform is a Duplex subclass where the readable side is derived from the writable side. In a plain Duplex such as a socket, what you write and what you read are unrelated.

### NODE-152 — Flowing vs paused Readable

**Difficulty:** Junior

**Category:** Readable modes

**Question:**

Explain flowing and paused mode of a Readable and what switches between them.

**Answer:**

A Readable starts out paused. It switches to flowing mode when you attach a `'data'` listener, call `.resume()`, or call `.pipe()`. In flowing mode, chunks are handed to your listeners as soon as they are available. In paused mode, you pull chunks yourself by calling `.read()` after a `'readable'` event. The property `readable.readableFlowing` tells you which state you are in: `null` means no consumer yet, `true` means flowing, and `false` means explicitly paused.

**Follow-up:**

What happens to data produced before a `'data'` listener is attached?

Answer: Nothing is emitted while there is no consumer. Chunks wait in the internal buffer up to `highWaterMark`, then the source is told to stop producing. Attaching `'data'` later starts delivery from that buffer.

### NODE-153 — objectMode

**Difficulty:** Intermediate

**Category:** objectMode

**Question:**

What is `objectMode`, and what changes when you enable it?

**Answer:**

With `objectMode: true`, a stream carries any JavaScript value instead of just Buffers or strings. Each `push()` or `write()` is one unit, and chunks are never merged or split. Two things change: `highWaterMark` counts objects (default 16) instead of bytes, and you can no longer use `null` as a value because `null` means end of stream. It is useful for passing parsed records, rows, or events between processing stages.

**Follow-up:**

Can the two sides of a Transform differ in mode?

Answer: Yes. `readableObjectMode` and `writableObjectMode` are separate options, so a parser can take bytes in and emit objects out.

### NODE-154 — highWaterMark and its defaults

**Difficulty:** Intermediate

**Category:** Backpressure

**Question:**

What is `highWaterMark`, and what are the byte defaults in Node 20 versus Node 22?

**Answer:**

`highWaterMark` is the size at which a stream's internal buffer is considered full. Once buffered data reaches it, `write()` and `push()` return `false`. This is a signal to slow down, not a hard limit. For byte streams, the default is 16 KiB in Node 20. In Node 22 it is 64 KiB on non-Windows platforms, and Windows stays at 16 KiB. In `objectMode` it is still 16 objects. `fs.createReadStream` already used 64 KiB.

**Trade-offs:**

A larger value means fewer syscalls and better throughput, but it costs more memory per stream. With thousands of connections, 64 KiB each adds up.

**Follow-up:**

Does hitting `highWaterMark` reject the chunk?

Answer: No. The chunk is accepted and buffered. A `false` return only asks the producer to pause until `'drain'`. If the producer ignores it, the buffer keeps growing without a limit.

### NODE-155 — Backpressure

**Difficulty:** Intermediate

**Category:** Backpressure

**Question:**

What is backpressure, and how does Node implement it?

**Answer:**

Backpressure is the consumer telling the producer to slow down. When `writable.write(chunk)` returns `false`, the producer should stop writing until the writable emits `'drain'`. `pipe()` and `pipeline()` do this for you: they pause the source and resume it on `'drain'`. Without backpressure, if the producer is faster than the destination, the writable's buffer keeps growing until the process runs out of memory.

**Follow-up:**

What exactly makes `write()` return `false`?

Answer: The writable's buffered length reaching or exceeding its `writableHighWaterMark`. The write itself still succeeds.

### NODE-156 — pipe vs pipeline

**Difficulty:** Intermediate

**Category:** pipe and pipeline

**Question:**

What are the differences between `.pipe()` and `stream.pipeline()`?

**Answer:**

Both handle backpressure, but only `pipeline()` handles errors. With `pipe()`, if the destination fails, the source is just unpiped and stays open. That can leak file descriptors or sockets, and you need an `'error'` handler on every stream. `pipeline()` forwards errors, destroys all the streams when something fails or finishes, and reports the result once through a callback or a promise. That is why you should prefer it in production.

**Follow-up:**

If the middle Transform throws, which streams are destroyed?

Answer: All of them: the source, the Transform, and the destination. The callback or promise receives the first error.

### NODE-157 — pipeline from stream/promises

**Difficulty:** Intermediate

**Category:** pipe and pipeline

**Question:**

How do you use `pipeline` from `node:stream/promises`, and what can it accept?

**Answer:**

You call `await pipeline(src, ...stages, dest)`. The returned Promise resolves when the last stream finishes and rejects on the first error. The middle stages can be Transforms or async generator functions. You can also pass an options object as the last argument, with a `signal` for cancellation. Every stream is cleaned up automatically.

**Code:**

```js
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(createReadStream('in.log'), createGzip(), createWriteStream('in.log.gz'));
```

**Follow-up:**

Why prefer `await pipeline` over the callback form?

Answer: Errors show up in a normal `try/catch`, you cannot accidentally call the callback twice, and the flow reads top to bottom alongside other async code.

### NODE-158 — finished()

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

What does `finished()` do, and when do you need it instead of `pipeline`?

**Answer:**

`finished(stream, cb)`, or its promise version in `stream/promises`, tells you when a stream is done: it ended, errored, or was closed early. If the stream is destroyed before a clean end, you get `ERR_STREAM_PREMATURE_CLOSE`. Use it when you cannot wrap the flow in `pipeline`, for example to clean up after an HTTP response that a framework is writing for you.

**Follow-up:**

Why keep the cleanup function that `finished` returns?

Answer: Calling it removes the listeners that `finished` added. On long-lived streams, forgetting it leaves listeners attached and can trigger `MaxListenersExceededWarning`.

### NODE-159 — destroy and error propagation

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

How do `destroy()` and error propagation work on a stream?

**Answer:**

`stream.destroy(err?)` shuts the stream down. It runs `_destroy`, releases resources, emits `'error'` if you passed an error, and then emits `'close'`. After that, writes fail and reads end. With `autoDestroy: true` (the default), a stream destroys itself after `'end'`, `'finish'`, or an error. Importantly, `destroy()` does not touch other streams you piped to; `pipeline` is what spreads the failure across the chain.

**Follow-up:**

What should `_destroy(err, cb)` do?

Answer: Close the underlying resource, such as a file descriptor, socket, or database cursor, then call `cb(err)` exactly once so the error keeps propagating.

### NODE-160 — for await over a stream

**Difficulty:** Intermediate

**Category:** Async iteration

**Question:**

How do you consume a Readable with `for await...of`, and how does it relate to backpressure?

**Answer:**

A Readable implements `Symbol.asyncIterator`, so you can loop over it with `for await`. The loop asks for the next chunk only after the previous iteration finishes, so backpressure happens naturally. Stream errors are thrown inside the loop, so a normal `try/catch` works. If you leave the loop early with `break`, `return`, or a thrown error, the stream is destroyed by default.

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

What does a slow loop body do to the stream?

Answer: The internal buffer fills to `highWaterMark`, then the source is paused until the loop catches up. Memory stays bounded.

### NODE-161 — Readable.from

**Difficulty:** Junior

**Category:** Readable

**Question:**

What is `Readable.from()`, and what is a common gotcha?

**Answer:**

`Readable.from()` creates a Readable from an iterable or async iterable, such as an array, a generator, or an async generator: `Readable.from(asyncGen())`. It is handy in tests and for turning generators into pipeline sources. The gotcha is that it defaults to `objectMode: true`. If your items are strings or Buffers that should be treated as bytes, pass `{ objectMode: false }`.

**Follow-up:**

What does `Readable.from('abc')` emit?

Answer: A single chunk containing the whole string `'abc'`, not one chunk per character. Strings and Buffers are special-cased so they are not iterated character by character.

### NODE-162 — push(null)

**Difficulty:** Junior

**Category:** Readable

**Question:**

What does `push(null)` mean in a custom Readable?

**Answer:**

Calling `push(null)` signals the end of the data. Anything already buffered is still delivered, and then `'end'` is emitted. Pushing after that raises `ERR_STREAM_PUSH_AFTER_EOF`. This is also why `null` cannot be a data value in `objectMode`. If you forget to push `null`, consumers wait forever and `pipeline` never resolves.

**Follow-up:**

How would you notice a missing `push(null)` in production?

Answer: Requests or jobs hang with no error, and the stream never emits `'end'` or `'close'`. A timeout or an `AbortSignal` on the pipeline exposes the problem.

### NODE-163 — Implementing _read

**Difficulty:** Intermediate

**Category:** Readable

**Question:**

How do you implement `_read()` correctly for an async source?

**Answer:**

Node calls `_read(size)` when the consumer wants more data. In it, fetch or generate data, call `this.push(chunk)`, and push `null` when the source is finished. If `push()` returns `false`, stop until `_read` is called again. For async sources, keep a flag so you do not start a second fetch while one is still running. On failure, call `this.destroy(err)` instead of throwing.

**Follow-up:**

Why can `_read` be called again before an async fetch has finished?

Answer: Node calls it whenever the buffer is below `highWaterMark` and nothing has been pushed yet. A guard such as `if (this.reading) return` prevents overlapping fetches and out-of-order chunks.

### NODE-164 — Implementing _write

**Difficulty:** Intermediate

**Category:** Writable

**Question:**

How do you implement a Writable with `_write()`, and what must the callback do?

**Answer:**

`_write(chunk, encoding, callback)` processes one chunk. When it is done, it must call `callback()` or `callback(err)` exactly once. If you never call it, the stream stalls; calling it twice is an error. By default, chunks arrive as Buffers because `decodeStrings` is `true`. For simple cases, you can skip subclassing: `new Writable({ write(chunk, enc, cb) { ... } })`.

**Follow-up:**

What happens to later `write()` calls while a callback is pending?

Answer: They are queued in the writable buffer and processed in order once the pending one completes. When the queue passes `highWaterMark`, `write()` returns `false`.

### NODE-165 — _transform and _flush

**Difficulty:** Intermediate

**Category:** Transform

**Question:**

How do `_transform` and `_flush` work in a Transform?

**Answer:**

`_transform(chunk, enc, cb)` receives input and calls `this.push(out)` zero or more times. Then it calls `cb()`, or `cb(null, out)` as a shortcut for one output chunk. `_flush(cb)` runs once all input has been consumed, just before `'end'`. It is your chance to emit anything still held in memory, such as the last partial line, a checksum trailer, or leftover bytes.

**Follow-up:**

Why is a line-splitting Transform wrong without `_flush`?

Answer: The final line often has no trailing newline, so it is still sitting in the carry-over buffer at the end. Without `_flush`, that last record is silently dropped.

### NODE-166 — Duplex vs Transform

**Difficulty:** Intermediate

**Category:** Duplex and Transform

**Question:**

Give a concrete example of a Duplex and of a Transform, and say how you implement each.

**Answer:**

A TCP `net.Socket` is a Duplex. It reads what the peer sends and writes what you send, and the two sides are unrelated. Gzip, encryption, and parsers are Transforms, where what you write determines what you read. To implement a Duplex, provide both `_read` and `_write`. To implement a Transform, provide `_transform` and, optionally, `_flush`.

**Follow-up:**

What is `PassThrough` for?

Answer: It is a Transform that passes its input through unchanged. People use it as a tap point to observe or fork a stream, or as a placeholder in a pipeline.

### NODE-167 — cork and uncork

**Difficulty:** Senior

**Category:** Writable

**Question:**

What do `cork()` and `uncork()` do, and when do they help?

**Answer:**

`cork()` tells a Writable to hold all following writes in memory. `uncork()` releases them together, using `_writev` if the stream implements it, so they go out as one batch. This helps when you make many small writes, such as header lines followed by a body on a socket. Calls nest, so each `cork()` needs its own `uncork()`. A common idiom is `process.nextTick(() => stream.uncork())`.

**Follow-up:**

What happens to corked data if you call `end()`?

Answer: `end()` uncorks fully and flushes the pending writes before finishing. `destroy()`, on the other hand, throws the buffered data away without writing it.

### NODE-168 — _writev

**Difficulty:** Senior

**Category:** Writable

**Question:**

What is `_writev`, and why would you implement it?

**Answer:**

`_writev(chunks, cb)` receives an array of `{ chunk, encoding }` entries and handles them in a single operation, such as one multi-row database insert or one `writev` syscall. Node uses it when writes have piled up, either because of `cork()` or because earlier writes were still in progress. The order of chunks in the array is preserved.

**Follow-up:**

Do you have to implement `_write` as well?

Answer: Yes. `_write` is still needed for the case where only one chunk is pending. Many implementations simply make `_write` call `_writev` with a one-element array.

### NODE-169 — Buffer vs string encoding

**Difficulty:** Intermediate

**Category:** Encoding

**Question:**

How do encodings behave in streams, and what is the multi-byte pitfall?

**Answer:**

By default, a Readable emits Buffers. If you call `setEncoding('utf8')` or pass the `encoding` option, it emits strings instead, using an internal `StringDecoder`. The decoder correctly joins multi-byte characters that were split across two chunks. If you call `chunk.toString()` on each Buffer yourself, a character that straddles a chunk boundary can be corrupted and show up as `�`.

**Follow-up:**

Why is `Buffer.concat(chunks).toString()` safer than `str += chunk`?

Answer: With `str += chunk` on Buffers, each chunk is decoded separately, so boundary characters break. Joining the bytes first and decoding once, or using `setEncoding`, keeps characters intact.

### NODE-170 — fs.createReadStream options

**Difficulty:** Intermediate

**Category:** fs streams

**Question:**

What are the key options of `fs.createReadStream`, and how do its errors surface?

**Answer:**

The main options are `start` and `end` (inclusive byte offsets, useful for HTTP Range requests), `highWaterMark` (64 KiB by default), `encoding`, `flags`, `fd`, `autoClose`, and `signal`. The file is opened lazily, and the stream emits `'open'`, `'ready'`, `'data'`, `'end'`, and `'close'`. Failures such as `ENOENT` arrive asynchronously as `'error'` events. They are not thrown as exceptions.

**Follow-up:**

How do you serve a byte range safely?

Answer: Parse and validate the `Range` header against the file size, and answer 416 if it cannot be satisfied. Otherwise set `start`, `end`, and `Content-Range`. Use `pipeline` so a client abort closes the file.

### NODE-171 — fs.createWriteStream, finish vs close

**Difficulty:** Intermediate

**Category:** fs streams

**Question:**

What do `fs.createWriteStream` flags control, and how do `'finish'` and `'close'` differ?

**Answer:**

The default flag `'w'` truncates the file, `'a'` appends, and `'wx'` fails if the file already exists. `'finish'` fires after `end()` once all data has been handed to the operating system. `'close'` fires after the file descriptor has been closed. Before you read the file back, rename it, or delete it, wait for `'close'`, or use `pipeline` or `finished`.

**Follow-up:**

Does `'finish'` mean data is on disk?

Answer: No. It means the OS accepted the writes, but they may still be in the page cache. If you need durability, call `fsync` (`fs.fsync` or `filehandle.sync()`).

### NODE-172 — Request as Readable

**Difficulty:** Intermediate

**Category:** HTTP

**Question:**

Why is `http.IncomingMessage` a Readable, and what does that imply for handlers?

**Answer:**

The request body arrives from the socket in chunks, so `req` is a Readable. You need to consume it with `for await`, `pipe`, or `resume()`, otherwise the connection can stall. Never buffer an unbounded body; enforce a size limit and respond with 413 when it is exceeded. If the client disconnects, `req` emits `'close'`, and consumers see an abort error.

**Follow-up:**

What if the handler responds without reading the body?

Answer: If little is left, Node may drain it for you. For a large body, the connection can be closed or left in a bad keep-alive state. Call `req.resume()` or destroy the request to avoid stalls.

### NODE-173 — Streaming a response

**Difficulty:** Intermediate

**Category:** HTTP

**Question:**

`res` is a Writable. How do you stream a large file response correctly?

**Answer:**

Set the headers first, then call `pipeline(fs.createReadStream(path), res, cb)`. Without a `Content-Length`, Node uses chunked transfer encoding. Backpressure flows from the client's socket back to the file stream. If the client disconnects, the pipeline fails with a premature close and destroys the file stream, which frees the descriptor. By contrast, `readFile` followed by `res.end(data)` costs the full file size in memory for every concurrent request.

**Follow-up:**

What does 1,000 concurrent 500 MB downloads cost each way?

Answer: With `readFile`, about 500 GB of memory, so it will fail. Streaming holds roughly 64 KiB per request plus socket buffers.

### NODE-174 — Proxying an upload

**Difficulty:** Senior

**Category:** HTTP

**Question:**

How would you proxy an incoming upload to another service using streams?

**Answer:**

Open an outbound `http.request`, or use `fetch` with a stream body, and call `pipeline(req, upstreamReq)`. Forward the relevant headers, then pipeline the upstream response into `res`. Memory stays bounded, and backpressure flows end to end. Check size limits before forwarding, handle errors in both directions, and abort the upstream request if the client leaves.

**Follow-up:**

Why does `fetch` need `duplex: 'half'` with a stream body?

Answer: Undici requires it whenever the request body is a stream. It means the whole request body is sent before the response is read. Without it, `fetch` throws.

### NODE-175 — Premature close

**Difficulty:** Intermediate

**Category:** Error handling

**Question:**

What is a premature close, and how does it surface?

**Answer:**

A premature close happens when a stream is destroyed, or its peer disconnects, before a normal `end` or `finish`. `pipeline` and `finished` then fail with `ERR_STREAM_PREMATURE_CLOSE`. Common causes are a client aborting a download, a socket reset, or a `break` inside `for await`. It is often expected, so log it at low severity instead of paging someone.

**Follow-up:**

How do you tell a client abort from a server fault?

Answer: Check `err.code === 'ERR_STREAM_PREMATURE_CLOSE'` together with `req.destroyed` or the response's `writableEnded`. Treat it as a server fault only if the server side failed first.

### NODE-176 — pipe error-handling pitfalls

**Difficulty:** Senior

**Category:** Error handling

**Question:**

What are the main error-handling pitfalls of `.pipe()`?

**Answer:**

First, errors do not propagate, so every stream needs its own `'error'` handler. Second, when the destination fails, the source is only unpiped, not destroyed, which leaks file descriptors and sockets. Third, in `a.pipe(b).pipe(c)` the return value is the last stream, so developers tend to attach a handler only there. A missing handler turns into an uncaught exception. `pipeline` avoids all of these problems.

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

Answer: You cannot change the status code any more. Destroy the response so the client sees a broken stream, rather than a truncated body that looks complete.

### NODE-177 — Unhandled stream error

**Difficulty:** Junior

**Category:** Error handling

**Question:**

What happens when a stream emits `'error'` and no listener is attached?

**Answer:**

Like any `EventEmitter`, an unhandled `'error'` event is thrown as an uncaught exception. That crashes the process unless an `uncaughtException` handler exists. So always attach `'error'` listeners, or use `pipeline` or `finished`. Also remember that after `'error'` the stream is destroyed, so do not expect `'end'` or `'finish'` to follow.

**Follow-up:**

Why does `try/catch` around `.pipe()` not help?

Answer: Stream errors are emitted later, asynchronously, outside the original call stack. Only `await pipeline(...)` turns them into a rejection that you can catch.

### NODE-178 — Memory blowup from wrong buffering

**Difficulty:** Senior

**Category:** Memory

**Question:**

How does wrong buffering blow up memory in stream code, and how do you fix it?

**Answer:**

Memory blows up when it grows with the input size or with the speed gap between producer and consumer. Typical causes are collecting every chunk into an array or string, calling `readFile` and `JSON.parse` on huge inputs, and producers that ignore backpressure. The fix is to process data incrementally through `pipeline`, cap the number of bytes you accumulate, and respect the return value of `write()`.

**Follow-up:**

How would you diagnose it?

Answer: Compare RSS with heap used, because Buffers live outside the heap. Also sample `readableLength` and `writableLength` on suspect streams. Lengths that keep growing point to missing backpressure.

### NODE-179 — Ignoring write() return value

**Difficulty:** Senior

**Category:** Backpressure

**Question:**

What is wrong with writing in a loop and ignoring the return value of `write()`?

**Answer:**

`write()` never blocks. In a loop like `for (...) w.write(row)`, if the destination is slower than the loop, everything piles up in memory. The correct pattern is `if (!w.write(x)) await once(w, 'drain')`. Even better, produce the data from a Readable or an async generator and send it through `pipeline`, which handles this for you.

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

`compose(...streams)` joins several streams or async generator functions into one Duplex. The first stage becomes the writable side and the last stage becomes the readable side. Like `pipeline`, it propagates errors and destroys all the parts. This lets you export a reusable processing step as a single stream. The API is still marked experimental in Node 20 and 22, so check the stability index before depending on it.

**Follow-up:**

How does it differ from `pipeline`?

Answer: `pipeline` wires a complete source-to-sink flow and runs it. `compose` returns a stream that is itself one stage, which you can write into, read from, or place inside another pipeline.

### NODE-181 — Uppercase Transform

**Difficulty:** Junior

**Category:** Transform examples

**Question:**

Write an uppercase Transform and name its UTF-8 caveat.

**Answer:**

Create a Transform whose `transform` callback converts the chunk to upper case and passes it on. This is fine for ASCII demos. The caveat is that with multi-byte UTF-8, converting each Buffer chunk separately can corrupt characters that are split across chunks. Decode first, with `setEncoding('utf8')` on the input side or a `StringDecoder`, before changing the text.

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

Answer: `async function* (src) { for await (const c of src) yield String(c).toUpperCase(); }`, placed inside `pipeline`. Set the source to a string encoding, or decode inside the generator.

### NODE-182 — NDJSON parsing Transform

**Difficulty:** Senior

**Category:** Transform examples

**Question:**

How do you parse newline-delimited JSON from a byte stream with a Transform?

**Answer:**

Keep a string called `tail` for the incomplete last line. For each chunk, do `const lines = (tail + chunk).split('\n'); tail = lines.pop();`, then push `JSON.parse(line)` for every non-empty line. In `_flush`, parse whatever is left in `tail`. Set `readableObjectMode: true` so the output side emits objects while the input side stays bytes. Decode with `StringDecoder` so multi-byte characters are not broken.

**Follow-up:**

How do you handle a malformed line?

Answer: It depends on the use case. You can fail the stream with `cb(err)`, skip the line and count it, or send it to a dead-letter sink. Include the line number in the error to help debugging.

### NODE-183 — Async generators as pipeline stages

**Difficulty:** Intermediate

**Category:** Transform examples

**Question:**

Can you use async generators as `pipeline` stages, and why would you?

**Answer:**

Yes. The generator receives the previous stage as an async iterable and yields its output. Backpressure and error propagation come from the iteration protocol, and `try/finally` gives you clean teardown. For stateless or lightly stateful steps, this is easier to read than a Transform subclass. A native Transform can be somewhat faster in very hot paths.

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

They are iterator-helper style operators on Readable: `map`, `filter`, `forEach`, `take`, `drop`, `flatMap`, `reduce`, and `toArray`. They return either a new Readable or a Promise. `map` accepts a `concurrency` option for running async work in parallel. They were experimental in Node 20 and may change, so check the stability index for your version. Be careful with `toArray()`: it buffers everything, so use it only on bounded input.

**Follow-up:**

How does `concurrency` in `map` affect order and memory?

Answer: Output order is preserved even when work finishes out of order, so one slow item can hold finished results in memory. Higher concurrency raises the peak number of buffered items.

### NODE-185 — stream/promises vs promisify

**Difficulty:** Junior

**Category:** pipe and pipeline

**Question:**

`node:stream/promises` or `util.promisify(stream.pipeline)`: which do you use?

**Answer:**

Use `node:stream/promises`. It is the native promise API for `pipeline` and `finished`, and it supports `signal` in its options. `util.promisify(stream.pipeline)` also works, because `pipeline` has a custom promisify hook that points to the same implementation. But the explicit import is clearer and is the recommended style.

**Follow-up:**

How does the callback `pipeline` know the last argument is a callback?

Answer: If the final argument is a function and not a stream or iterable stage, it is treated as the completion callback. Async generator functions in the middle are recognized by their position.

### NODE-186 — Cancelling a pipeline

**Difficulty:** Senior

**Category:** Cancellation

**Question:**

How do you cancel a pipeline with `AbortSignal`?

**Answer:**

Pass `{ signal }` as the last argument: `await pipeline(a, b, c, { signal })`. When the signal aborts, all the streams are destroyed and the promise rejects with `AbortError`. For single streams, `fs.createReadStream({ signal })` and `stream.addAbortSignal(signal, stream)` do the same. This is useful both for timeouts and for client disconnects.

**Follow-up:**

How do you combine a timeout and a client abort?

Answer: `AbortSignal.any([AbortSignal.timeout(ms), clientSignal])` gives you one signal that fires on whichever happens first. `AbortSignal.any` is available from Node 20.3.

### NODE-187 — Node streams vs Web Streams

**Difficulty:** Senior

**Category:** Web Streams

**Question:**

How do Node streams and Web Streams differ, and how do you interoperate?

**Answer:**

Web Streams (`ReadableStream`, `WritableStream`, `TransformStream`) follow the WHATWG standard. They are used by `fetch` bodies and work across browsers, Deno, and workers. Node streams have the larger ecosystem, including fs, net, and zlib. You can convert between them with `Readable.toWeb()`, `Readable.fromWeb()`, `Writable.toWeb()`, and `Writable.fromWeb()`. Both kinds support async iteration.

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

Answer: You can iterate it directly. Converting lets you use `pipeline` with Node writables and keeps a single cleanup and error model.

### NODE-188 — end, finish, close

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

Explain `'end'`, `'finish'`, and `'close'`.

**Answer:**

`'end'` is a Readable event: no more data will be delivered. It is not emitted if nobody consumes the stream. `'finish'` is a Writable event: after `end()` was called, all data has been flushed to the underlying system. `'close'` means the stream and its resources, such as a file descriptor or socket, have been released. It follows destroy when `emitClose` is `true`. A Duplex can emit all three.

**Follow-up:**

Which event do you wait for before deleting a temp file you just wrote?

Answer: `'close'`, because only then is the file descriptor closed. On most systems deleting earlier works, but on Windows it can fail. `pipeline` waits for the right moment anyway.

### NODE-189 — autoDestroy, emitClose, autoClose

**Difficulty:** Senior

**Category:** Lifecycle

**Question:**

What do `autoDestroy`, `emitClose`, and `autoClose` do?

**Answer:**

`autoDestroy` (default `true` since Node 14) destroys the stream automatically after `'end'`, `'finish'`, or an error. `emitClose` (default `true`) makes the stream emit `'close'` after it is destroyed. `autoClose` only applies to `fs` streams and closes the file descriptor on end or error. If you set `autoDestroy: false`, you must call `destroy()` yourself or you leak resources.

**Follow-up:**

When would you ever disable `autoDestroy`?

Answer: Rarely: only if you need to reuse a stream after `'end'`, such as a custom Duplex that has to be reset. For normal streams, leave it on.

### NODE-190 — 'readable' and read() vs 'data'

**Difficulty:** Senior

**Category:** Readable modes

**Question:**

How do `'readable'` plus `read()` differ from `'data'`?

**Answer:**

`'data'` pushes chunks to you in flowing mode. `'readable'` only tells you that data, or the end of the stream, is available, and you pull it with `read(n)` in a loop until it returns `null`. `read(size)` can return exactly `size` bytes when they are available, which suits binary framing. If you attach both, `'readable'` takes precedence, and `'data'` does not start flowing until you call `read()`.

**Follow-up:**

How would you parse a length-prefixed binary frame?

Answer: Call `read(4)` for the length header, then `read(len)` for the payload. If `read` returns `null`, wait for the next `'readable'` and retry. Use `unshift` to push bytes back if you read too much.

### NODE-191 — Mixing consumption styles

**Difficulty:** Senior

**Category:** Readable modes

**Question:**

What goes wrong if you mix `'data'`, `'readable'`, `pipe`, and async iteration on one stream?

**Answer:**

They all consume the same stream, so they interfere with each other. Adding `'readable'` stops automatic flowing, and removing it may or may not resume it. Async iteration uses `read()` internally. Mixing styles can lose chunks, hang, or process data twice. Pick one consumption style per stream and document it in the function that owns the stream.

**Follow-up:**

How do you debug a stalled stream?

Answer: Log `readableFlowing`, `readableLength`, `isPaused()`, and `listenerCount('data')` and `listenerCount('readable')`. Together they usually show which consumer paused it.

### NODE-192 — pause, resume, unpipe

**Difficulty:** Senior

**Category:** pipe and pipeline

**Question:**

How do `pause()`, `resume()`, and `unpipe()` interact with `pipe`?

**Answer:**

`pipe` calls `pause()` on the source when `dest.write()` returns `false`, and calls `resume()` on `'drain'`. This means a manual `pause()` can be undone by the next `'drain'`. `unpipe(dest)` detaches the destination, and when no pipes remain, the source goes back to the paused state. Data that was already buffered stays in the source.

**Follow-up:**

After `unpipe()`, what must you do to avoid stuck data?

Answer: Attach a new consumer or call `resume()`; otherwise the stream stays paused and holds its buffered data. If you want to throw the data away, call `resume()` with no listener, or `destroy()`.

### NODE-193 — Separate high-water marks on a Transform

**Difficulty:** Senior

**Category:** Backpressure

**Question:**

How do `readableHighWaterMark` and `writableHighWaterMark` work on a Transform?

**Answer:**

A Transform has two buffers, one for each side. `highWaterMark` sets both, while `readableHighWaterMark` and `writableHighWaterMark` set each one independently. Different values help when the output is much bigger than the input, as in decompression, or when one side uses `objectMode`, such as bytes in and objects out. Worst-case memory for a chain is roughly the sum of both buffers across all stages.

**Follow-up:**

How much memory could a chain of N Transforms hold with defaults?

Answer: About N × (readable + writable high-water marks), so around 128 KiB per stage in Node 22 on Linux, plus the source and sink buffers. It is bounded, unlike unmanaged buffering.

### NODE-194 — Gzip with streams and the libuv pool

**Difficulty:** Senior

**Category:** zlib

**Question:**

How do you gzip a file with streams, and what happens under heavy parallel use?

**Answer:**

Use `await pipeline(createReadStream(src), zlib.createGzip(), createWriteStream(dst))`, and `createGunzip()` to decompress. Memory stays bounded. Async zlib work runs on libuv's threadpool, which has four threads by default (`UV_THREADPOOL_SIZE`). Under heavy parallel use, compressions queue up and can also delay `fs` calls and `dns.lookup`. Also note that `zlib.createZstdCompress` was added only in later 22.x releases (22.15) as experimental, so check your exact release.

**Follow-up:**

Where does a corrupt gzip input fail?

Answer: The Gunzip stream emits an error such as `Z_DATA_ERROR`. `pipeline` destroys the other streams and rejects, so the descriptors are closed.

### NODE-195 — process.stdin and stdout

**Difficulty:** Intermediate

**Category:** Process streams

**Question:**

What should you know about `process.stdin` and `process.stdout` as streams?

**Answer:**

`stdin` is a Readable, and `stdout` and `stderr` are Writables. Whether writes are synchronous depends on the target and platform: files are synchronous, TTYs differ between POSIX and Windows, and pipes may be asynchronous. So calling `process.exit()` right after a large write can truncate the output. Prefer letting the process end naturally, and use `pipeline(process.stdin, transform, process.stdout)` for filter-style programs.

**Follow-up:**

`pipeline` destroys `process.stdout` at the end. How do you avoid that?

Answer: Pass `{ end: false }` where supported, or wrap the last stage in a `PassThrough` that you pipe manually with `{ end: false }`. Another option is to use an async generator as the last stage and write with `process.stdout.write`.

### NODE-196 — _final

**Difficulty:** Senior

**Category:** Writable

**Question:**

What is `_final()` in a Writable, and when do you use it?

**Answer:**

`_final(cb)` runs after `end()` was called and all pending writes have completed, but before `'finish'` is emitted. Use it to flush buffered data, commit a transaction, or close a connection. If you pass an error to `cb`, the stream emits `'error'` and no `'finish'`. It is the Writable counterpart of a Transform's `_flush`.

**Follow-up:**

How do you ensure a batching DB writer persists its last partial batch?

Answer: Collect rows in an array in `_write` and insert when the batch is full. In `_final`, insert whatever remains before calling `cb`. Without that, the last rows are lost.

### NODE-197 — Duplex.from

**Difficulty:** Staff

**Category:** Composition

**Question:**

What is `Duplex.from()` used for?

**Answer:**

`Duplex.from()` converts several kinds of input into a Duplex: a `{ readable, writable }` pair, an async generator function, a Promise, or a Web Streams pair. It makes wrapping easy, for example turning an async function into a stage for `pipeline` or `compose`. It also forwards destroy and errors to the wrapped parts.

**Follow-up:**

How does it differ from subclassing Transform?

Answer: It takes less code and uses iteration semantics, but you lose fine control over `_flush`, per-side high-water marks, and chunk-level callbacks.

### NODE-198 — break inside for await

**Difficulty:** Intermediate

**Category:** Async iteration

**Question:**

What happens to a stream when you `break` out of `for await`?

**Answer:**

The iterator's `return()` is called, and by default the stream is destroyed (`destroyOnReturn: true`), which releases resources such as file descriptors. If you want to keep using the stream afterwards, create the iterator with `readable.iterator({ destroyOnReturn: false })`. A common bug is to `break` after reading a header from a stream that you still need to pipe somewhere else.

**Follow-up:**

What do other consumers of that stream see?

Answer: They see a premature close or an abort-type error once it is destroyed, because the stream will not end normally.

### NODE-199 — Consuming a stream twice

**Difficulty:** Staff

**Category:** Fan-out

**Question:**

Can a stream be consumed twice? How do you fork one?

**Answer:**

No. Once data is consumed, it is gone. To fan out, pipe the source into several `PassThrough` streams. The slowest consumer sets the speed, because `pipe` pauses whenever any destination returns `false`, and a branch that nobody reads stalls everyone. Alternatives are to buffer to disk and read twice, or to use the Web `ReadableStream.tee()`, which buffers without limit if the branches are read at different speeds.

**Trade-offs:**

Fan-out saves a second read of the source, but ties the consumers' health together. A failing branch must not silently stall the others, so wrap everything in `pipeline` and abort all branches on any error.

**Follow-up:**

How would you hash a file and upload it from a single read?

Answer: Send the file through one Transform that updates `crypto.createHash` while forwarding each chunk to the upload. If the upload fails, the pipeline aborts and the partial hash is discarded.

### NODE-200 — Reading a body to JSON safely

**Difficulty:** Senior

**Category:** HTTP

**Question:**

How do you safely read a request body into JSON, and what is `node:stream/consumers`?

**Answer:**

`node:stream/consumers` provides `text`, `json`, `buffer`, `arrayBuffer`, and `blob`, which read a whole stream into one value: `const body = await json(req)`. Because they buffer everything, add a size limit first. Check `Content-Length`, and wrap the stream in a counting Transform that fails with 413 once the cap is exceeded. For very large payloads, use an incremental parser instead of building one huge value.

**Follow-up:**

How do you also defend against slow uploads?

Answer: Set the server-level `headersTimeout` and `requestTimeout`, plus an application timeout or an `AbortSignal` on the body read. Close connections that send bytes too slowly.
