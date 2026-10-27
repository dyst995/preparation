# NODE05 — HTTP

Node.js 20/22. Questions NODE-201–NODE-250.

These questions cover `node:http` and `node:https`, HTTP/2 at a high level, `fetch` and undici, and HTTP-layer concerns: request and response streams, headers and trailers, keep-alive, timeouts, body limits, chunked transfer, TLS basics, redirects, compression, CORS, proxy headers, WebSocket upgrade, Server-Sent Events, graceful shutdown, `Expect: 100-continue`, range requests, and security headers. Streams themselves are NODE04; application-level authentication is out of scope.

HTTP in Node is streams over sockets. Set explicit timeouts and size limits, consume or cancel every body, and treat all forwarded headers as untrusted unless they come from a known proxy.

### NODE-201 — createServer and the request listener

**Difficulty:** Junior

**Category:** Server basics

**Question:**

What does `http.createServer` actually give you, and what is the request listener?

**Answer:**

It returns an `http.Server`, which is a subclass of `net.Server`. The server parses HTTP/1.1 with llhttp and emits a `'request'` event with `(req, res)` for every message. `req` is an `IncomingMessage` (a Readable) and `res` is a `ServerResponse` (a Writable). You still have to call `server.listen()`. Routing, body parsing, and error handling are not built in.

**Follow-up:**

Does the listener run once per connection or per request?

Answer: Once per request. One TCP connection can carry many requests in sequence with keep-alive, or many concurrent streams in HTTP/2. So never store per-user state on the socket without cleaning it up.

### NODE-202 — req and res as streams

**Difficulty:** Junior

**Category:** req and res streams

**Question:**

Why are `req` and `res` streams, and what does that change in practice?

**Answer:**

`req` is a Readable for the request body, and `res` is a Writable for the response. This lets you use `pipeline(req, transform, destination)` for uploads and `pipeline(source, res)` for downloads without holding everything in memory. Backpressure works the usual way: `res.write()` returns `false` when the client is slow, and you wait for `'drain'`.

**Follow-up:**

What happens if you ignore the request body?

Answer: If the body is never consumed, the connection may stall for keep-alive reuse, because the parser cannot move on to the next message. Node tries to discard unread bodies after the response ends, but for large uploads be explicit: call `req.resume()`, or `req.destroy()` if you reject the request.

### NODE-203 — Request headers in Node

**Difficulty:** Junior

**Category:** Headers

**Question:**

How does Node expose request headers, and what are the gotchas?

**Answer:**

`req.headers` is an object with lowercase names. If a header appears more than once, most are joined with `, `. But `set-cookie` is always an array, and a few headers such as `content-type` and `host` keep only the first value. `req.rawHeaders` keeps the original case and duplicates as a flat array. `req.headersDistinct` (Node 18.3+) gives an array of values for each name.

**Follow-up:**

Why can header handling cause security bugs?

Answer: Code that assumes a string may receive an array, for example with duplicated `x-forwarded-for` or cookies. That can break validation or allow spoofing. Normalize headers explicitly, and never rely on header casing or counts.

### NODE-204 — setHeader vs writeHead and headersSent

**Difficulty:** Intermediate

**Category:** Headers

**Question:**

What is the difference between `res.setHeader` and `res.writeHead`, and what is `headersSent`?

**Answer:**

`setHeader` queues a header, and you can still change it until the first byte is flushed. `writeHead(status, headers)` sets the status and headers together, and they are flushed on the first write. If both set the same header, the one passed to `writeHead` wins. Once headers are sent, `res.headersSent` is `true`, and calling `setHeader` throws `ERR_HTTP_HEADERS_SENT`.

**Follow-up:**

How do you handle an error after streaming started?

Answer: You can no longer change the status code. Destroy the response with `res.destroy(err)` so the client sees a broken stream, and log the error. Do not try to write a JSON error into a half-sent body.

### NODE-205 — HTTP trailers

**Difficulty:** Senior

**Category:** Trailers

**Question:**

What are HTTP trailers and how do you use them in Node?

**Answer:**

Trailers are headers sent after the body in a chunked message. On the server, declare them with a `Trailer` header, then call `res.addTrailers({...})` before `res.end()`. When reading a request, `req.trailers` is filled in only after the `'end'` event. A typical use is sending a checksum or a final status after a streamed response.

**Follow-up:**

Why are trailers rarely used?

Answer: They need chunked encoding or HTTP/2, and many proxies, browser `fetch` APIs, and frameworks drop or ignore them. gRPC, over HTTP/2, is the main user.

### NODE-206 — Server keep-alive and keepAliveTimeout

**Difficulty:** Intermediate

**Category:** Keep-alive

**Question:**

How does HTTP keep-alive work on the Node server, and what is `keepAliveTimeout`?

**Answer:**

HTTP/1.1 connections stay open by default. After sending a response, the server keeps the socket idle for `server.keepAliveTimeout` (default 5000 ms) while it waits for another request, and then closes it. Node also sends a `Keep-Alive: timeout=5` header so well-behaved clients know about the limit.

**Follow-up:**

Why do 502s appear behind an AWS ALB or nginx?

Answer: If Node closes idle sockets sooner than the proxy's idle timeout, the proxy may reuse a socket that Node just closed, which causes resets and 502s. Set `keepAliveTimeout` higher than the proxy's idle timeout (for example 65 s for an ALB with 60 s), and set `headersTimeout` above that.

### NODE-207 — headersTimeout and requestTimeout

**Difficulty:** Senior

**Category:** Timeouts

**Question:**

Explain `headersTimeout`, `requestTimeout`, and their defaults.

**Answer:**

`headersTimeout` (default 60 s) limits how long the server waits for the complete request headers. `requestTimeout` (default 300 s since v18) limits how long it waits for the entire request, headers and body together. If either is exceeded, the server closes the connection (it may send a 408 first). `connectionsCheckingInterval` (default 30 s) controls how often these limits are checked.

**Follow-up:**

Which of these protects against Slowloris?

Answer: Both help, together with `maxConnections` and a front proxy. Lower `requestTimeout` if you have no large uploads. For slow-upload endpoints, raise it or use streaming with per-route logic.

### NODE-208 — server.timeout and socket timeouts

**Difficulty:** Intermediate

**Category:** Timeouts

**Question:**

What does `server.timeout` / `socket.setTimeout` do?

**Answer:**

`server.timeout` is the socket inactivity timeout. Its default is `0`, meaning disabled, since Node 13. When you set it and a socket stays idle that long, the socket emits `'timeout'`, and if nobody listens, the socket is destroyed. `req.setTimeout` and `res.setTimeout` are per-request wrappers around the same socket timeout.

**Follow-up:**

Is it a total request deadline?

Answer: No. It resets on every bit of socket activity. For a hard deadline, use an `AbortController` with `setTimeout`, or `AbortSignal.timeout()`, in your handler and in downstream calls.

### NODE-209 — Request body size limits

**Difficulty:** Intermediate

**Category:** Body limits

**Question:**

How do you enforce a request body size limit in raw Node?

**Answer:**

First, check `Content-Length` and reply `413` right away if it is too large. Do not trust it alone, because chunked bodies have no length. So also count bytes as they stream in, using a `Transform` or `req.on('data')`, and abort when the limit is exceeded. Then respond with 413 and `Connection: close`, and destroy the request.

**Follow-up:**

Why is `JSON.parse` of the whole body dangerous without limits?

Answer: Buffering unbounded input can exhaust memory, and parsing a huge body blocks the event loop. Cap the bytes before buffering, and consider limits on the depth and size of the parsed structure too.

### NODE-210 — Chunked transfer encoding

**Difficulty:** Intermediate

**Category:** Chunked transfer

**Question:**

What is chunked transfer encoding and when does Node use it?

**Answer:**

Chunked encoding sends the body as chunks, each prefixed with its size and ending with a zero-length chunk. This way the total length does not need to be known up front. Node uses it automatically for HTTP/1.1 responses when you call `write()` without setting `Content-Length`, and for client requests with a streamed body. HTTP/2 has its own framing and forbids `Transfer-Encoding`.

**Follow-up:**

How can you disable chunking for a response?

Answer: Set `Content-Length` before writing, and write exactly that many bytes. Or buffer the body and call `res.end(body)`; for a single `end` call, Node sets `Content-Length` itself.

### NODE-211 — Request smuggling and the HTTP parser

**Difficulty:** Senior

**Category:** Security

**Question:**

What is HTTP request smuggling and how does Node relate to it?

**Answer:**

Request smuggling exploits a disagreement between a front proxy and the backend about where one message ends and the next begins, usually involving `Content-Length` versus `Transfer-Encoding`. Node's llhttp parser is strict in current versions: it rejects invalid chunk syntax and conflicting framing. Still, you need to keep Node patched and run it behind proxies that interpret messages consistently.

**Follow-up:**

What Node flag is a red flag?

Answer: `--insecure-http-parser`, or `insecureHTTPParser: true`. It relaxes parsing to tolerate broken peers, and that reopens smuggling risks. Never use it in production when untrusted input can reach the server.

### NODE-212 — HTTPS server and TLS termination

**Difficulty:** Junior

**Category:** HTTPS

**Question:**

How do you create an HTTPS server and what is usually done in production instead?

**Answer:**

`https.createServer({ key, cert }, handler)` adds TLS, powered by OpenSSL, in front of the HTTP parser. In production, TLS is usually terminated earlier, at a load balancer or reverse proxy such as nginx, Envoy, or an ALB. Node then speaks plain HTTP on a private network. This makes certificate rotation simpler and moves the encryption CPU cost off Node.

**Follow-up:**

How do you rotate certs without restart?

Answer: Call `server.setSecureContext({ key, cert })` with the new material, for example on a file change or a `SIGHUP`. New connections use it, and existing ones continue as before.

### NODE-213 — TLS options and certificate verification

**Difficulty:** Intermediate

**Category:** HTTPS

**Question:**

What TLS options matter for HTTPS clients/servers?

**Answer:**

On the server: `minVersion` (default TLSv1.2), `ciphers`, `ca` plus `requestCert` for mutual TLS, and `SNICallback` to choose a certificate per hostname. On the client: `ca` for private certificate authorities, `servername`, and `rejectUnauthorized` (default `true`). If you have a private CA, add it or pin it instead of turning verification off.

**Follow-up:**

Why is `NODE_TLS_REJECT_UNAUTHORIZED=0` dangerous?

Answer: It disables certificate validation for the whole process. That makes man-in-the-middle attacks easy and silently affects every outbound call. For self-signed dev certificates, use `NODE_EXTRA_CA_CERTS` or a per-request `ca` instead.

### NODE-214 — HTTP/2 multiplexing vs HTTP/1.1

**Difficulty:** Intermediate

**Category:** HTTP/2

**Question:**

How does HTTP/2 multiplexing differ from HTTP/1.1 keep-alive?

**Answer:**

HTTP/2 runs many concurrent streams over one TCP connection. It uses binary framing, header compression (HPACK), and flow control for each stream. HTTP/1.1 allows only one in-flight request per connection in practice, because pipelining is not used, so clients open several connections. HTTP/2 removes head-of-line blocking at the HTTP level, but TCP-level blocking remains; HTTP/3 over QUIC fixes that.

**Follow-up:**

Does it make one connection always faster?

Answer: Not always. On lossy networks, a single TCP connection suffers packet-loss blocking across all its streams. Also, per-connection server resources, like flow-control windows and stream limits, need tuning.

### NODE-215 — HTTP/2 server and HTTP/1.1 fallback

**Difficulty:** Senior

**Category:** HTTP/2

**Question:**

How do you build an HTTP/2 server in Node and keep HTTP/1.1 clients working?

**Answer:**

Use `http2.createSecureServer({ key, cert, allowHTTP1: true })`. Then listen for `'stream'` (the core API) or `'request'` (the Compatibility API, which gives you `req` and `res`). Browsers only speak h2 over TLS, using ALPN `h2`. With `allowHTTP1` on, clients that negotiate `http/1.1` fall back to the regular request path.

**Follow-up:**

What is a common operational risk with HTTP/2?

Answer: Abuse such as Rapid Reset (CVE-2023-44487) and floods of streams or settings frames. Keep Node patched, limit `maxConcurrentStreams` and session memory, and where possible terminate h2 at a hardened proxy.

### NODE-216 — Detecting client disconnects

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

How do you detect client disconnects and stop work?

**Answer:**

Listen to `res.on('close')` and check `res.writableEnded`. If `close` fires before the response ended, the client went away. `req.on('close')` also fires after the request body is read, and on newer Node versions `req.destroyed` can help. The old `'aborted'` event is deprecated. Connect an `AbortController` to this, so you can cancel database and HTTP work.

**Follow-up:**

Why does this matter for SSE or long polling?

Answer: Without cleanup, each dead client leaks timers, subscriptions, and memory. Always remove listeners and clear intervals in the `close` handler.

### NODE-217 — Global fetch and undici

**Difficulty:** Junior

**Category:** fetch

**Question:**

What is global `fetch` in Node 20/22 and what powers it?

**Answer:**

`fetch`, `Request`, `Response`, `Headers`, and `FormData` are globals backed by a bundled copy of undici. It was experimental in Node 18 and stable from Node 21, and is fully usable in 20 and 22. It follows the WHATWG Fetch API and uses web streams for bodies. It runs on undici's own connection pool, not on `http.Agent`.

**Follow-up:**

Can you use `http.Agent` options with `fetch`?

Answer: No. Configure undici's `Agent` or dispatcher instead, through the `dispatcher` option. The bundled fetch accepts it when you import a compatible version of `undici`.

### NODE-218 — undici Agent and pooling

**Difficulty:** Intermediate

**Category:** undici

**Question:**

What is an undici `Agent` and why configure it?

**Answer:**

An undici `Agent` manages connection pools, one per origin: `new Agent({ connections, pipelining, keepAliveTimeout, keepAliveMaxTimeout, connect: { timeout } })`. Tuning it controls the maximum parallel sockets, how long idle connections are reused, and connection timeouts. Apply it with `fetch(url, { dispatcher })`, or use `setGlobalDispatcher(agent)` to affect all fetch calls.

**Follow-up:**

What does `pipelining` do?

Answer: It lets several HTTP/1.1 requests be queued on one socket without waiting for each response. The default is 1, which effectively turns it off, because pipelining causes head-of-line blocking and has proxy compatibility problems. Keep it at 1 unless you control both ends.

### NODE-219 — Global dispatcher, proxy, and defaults

**Difficulty:** Intermediate

**Category:** undici

**Question:**

How do you set global fetch defaults, such as a proxy or custom CA?

**Answer:**

Create a dispatcher, such as an `Agent`, a `ProxyAgent`, or `Agent({ connect: { ca } })`, and call `setGlobalDispatcher`. `ProxyAgent` handles CONNECT tunnelling through an HTTP proxy. By default, Node does not read `HTTP_PROXY` for `fetch`; newer versions add an opt-in `NODE_USE_ENV_PROXY`.

**Follow-up:**

Where do you find defaults like timeouts?

Answer: In undici's documentation. The defaults are a 10 s connect timeout, 300 s for `headersTimeout` and `bodyTimeout`, and a 4 s `keepAliveTimeout`. Lower them for service-to-service calls.

### NODE-220 — http.Agent keep-alive and pooling

**Difficulty:** Intermediate

**Category:** http.Agent

**Question:**

How does `http.Agent` keep-alive work for `http.request`?

**Answer:**

Since Node 19, `http.globalAgent` has `keepAlive: true`, with a default idle timeout of 5 s. In earlier versions, every request opened a new connection unless you passed your own `new http.Agent({ keepAlive: true })`. `maxSockets` limits concurrent connections per host (default `Infinity`), and `maxFreeSockets` limits how many idle ones are kept.

**Follow-up:**

What leaks if you don't reuse agents?

Answer: Creating an agent per request means no connection pooling, port exhaustion from `TIME_WAIT` sockets, and slow TLS handshakes. Share one agent at module level.

### NODE-221 — AbortSignal with fetch and http.request

**Difficulty:** Intermediate

**Category:** AbortSignal

**Question:**

How does `AbortSignal` work with `fetch` and with `http.request`?

**Answer:**

For `fetch`, pass `signal`: `fetch(url, { signal })`. Aborting rejects the promise with an `AbortError`, or with the signal's `reason`. `http.request(url, { signal })` also works, and it destroys the request with an `AbortError`. `AbortSignal.timeout(ms)` makes a signal that aborts with a `TimeoutError`, and `AbortSignal.any([a, b])` combines several signals.

**Follow-up:**

Does aborting cancel server-side work?

Answer: Only indirectly. The TCP connection or stream is closed, and a well-written server notices through `close` and stops. It is not an RPC-style cancel, so non-idempotent operations may still complete.

### NODE-222 — Timeouts on fetch calls

**Difficulty:** Senior

**Category:** fetch

**Question:**

What timeouts exist on a `fetch` call, and what is missing?

**Answer:**

By default, undici applies a connect timeout (10 s), a headers timeout (300 s), and a body timeout (300 s). Many services find those too generous. There is no single "total timeout" option, except `AbortSignal.timeout()`. Use both: a signal for the overall deadline, and dispatcher options to catch stalls.

**Follow-up:**

Does `AbortSignal.timeout` cover reading the body?

Answer: Yes, if you read the body while the signal is still active, the abort will error the stream. Once the response has been fully consumed, the timer no longer matters.

### NODE-223 — fetch and HTTP error statuses

**Difficulty:** Junior

**Category:** fetch

**Question:**

Does `fetch` reject on HTTP 404/500?

**Answer:**

No. `fetch` rejects only for network failures, aborts, or invalid setup, usually as `TypeError: fetch failed` with a `cause`. For 4xx and 5xx statuses you get a normal `Response` with `ok === false`. So check `res.ok` or `res.status`, and handle the body yourself.

**Follow-up:**

Where is the real error?

Answer: In `err.cause`, for example `ECONNREFUSED` or `UND_ERR_CONNECT_TIMEOUT`. Log the `cause`, not just the generic message.

### NODE-224 — Consuming or cancelling fetch bodies

**Difficulty:** Senior

**Category:** fetch

**Question:**

Why must you consume or cancel a fetch response body?

**Answer:**

Undici keeps the connection busy until the body is read or cancelled. If you ignore the body, for example by checking only `status`, the socket may not return to the pool until garbage collection. That can cause connection starvation or memory pressure. Always call `await res.arrayBuffer()` or `res.text()`, or `res.body?.cancel()`, including on error paths.

**Follow-up:**

How do you stream a large response?

Answer: Iterate over `res.body`, which is a web ReadableStream and an async iterable in Node. Or convert it with `Readable.fromWeb(res.body)` and use `pipeline` to send it to disk or to a response.

### NODE-225 — fetch redirect handling

**Difficulty:** Intermediate

**Category:** Redirects

**Question:**

How does `fetch` handle redirects?

**Answer:**

With `redirect: 'follow'` (the default), fetch follows up to 20 redirects. With `'manual'`, it returns the 3xx response so you can handle it, and in Node you can read `Location`. With `'error'`, it rejects. A 301 or 302 on a POST switches to GET, while 307 and 308 keep the method and body. The `Authorization` header is dropped on cross-origin redirects.

**Follow-up:**

Why consider `redirect: 'manual'` on server-side fetch?

Answer: For SSRF protection. A URL you validated as public can redirect to `http://169.254.169.254` or to other internal hosts. With manual handling, you validate the destination of every hop yourself.

### NODE-226 — http.request and redirects

**Difficulty:** Intermediate

**Category:** Redirects

**Question:**

Does `http.request` follow redirects?

**Answer:**

No. The core `http` and `https` clients return the 3xx response and leave `Location` handling to you. Libraries such as `follow-redirects`, got, or axios add it. `fetch` follows redirects as the spec requires. Undici's low-level `request()` does not, unless you add the redirect interceptor.

**Follow-up:**

What must you do with a redirect response's body?

Answer: Consume it or destroy it with `res.resume()`, to free the socket before you send the next request.

### NODE-227 — Compressing HTTP responses

**Difficulty:** Intermediate

**Category:** Compression

**Question:**

How do you compress HTTP responses in Node?

**Answer:**

Read the `Accept-Encoding` header and pick `br`, `gzip`, or `deflate`. Set `Content-Encoding` and `Vary: Accept-Encoding`, remove `Content-Length`, and use `pipeline(source, zlib.createGzip(), res)`. Compress only compressible types such as JSON, text, and HTML; skip images and other already-compressed files. Better still, serve pre-compressed static assets, or compress at the proxy or CDN.

**Follow-up:**

Any security concern?

Answer: BREACH. If you compress responses that contain secrets (like CSRF tokens) along with attacker-controlled input, the secrets can leak. Also, compression is CPU-heavy and uses the threadpool, so set limits.

### NODE-228 — fetch and compressed bodies

**Difficulty:** Intermediate

**Category:** Compression

**Question:**

How does fetch deal with compressed responses and how do you send compressed requests?

**Answer:**

Undici's fetch sends `Accept-Encoding` and automatically decodes `gzip`, `deflate`, and `br` response bodies, so `res.text()` returns plain text. For request bodies, you compress them yourself with `zlib` or `CompressionStream` and set `Content-Encoding`. The receiving server must explicitly support compressed requests.

**Follow-up:**

Why is `Content-Length` sometimes misleading with fetch?

Answer: It reflects the encoded size, not the decoded size. So do not use it for size limits on decoded data. Guard against decompression bombs by capping the decoded bytes.

### NODE-229 — CORS headers and preflight

**Difficulty:** Junior

**Category:** CORS

**Question:**

How is CORS an HTTP-layer concern, and what does a preflight look like?

**Answer:**

CORS is enforced by browsers, based on response headers such as `Access-Control-Allow-Origin`, `-Methods`, `-Headers`, `-Max-Age`, and `-Expose-Headers`. For non-simple requests, the browser first sends an `OPTIONS` request with an `Origin` header and `Access-Control-Request-Method` / `-Headers`. The server must answer with 204 and the right headers before the browser sends the real request.

**Follow-up:**

Does CORS protect your server?

Answer: No. It only restricts what JavaScript in a browser may read. `curl` and other servers ignore it, so you still need authentication and CSRF protection.

### NODE-230 — CORS credentials and Vary

**Difficulty:** Intermediate

**Category:** CORS

**Question:**

What are the CORS pitfalls with credentials and caching?

**Answer:**

When the client uses `credentials: 'include'`, the server cannot answer `Access-Control-Allow-Origin: *`. It must echo one specific allowed origin and send `Access-Control-Allow-Credentials: true`. When you echo the origin, also add `Vary: Origin`, so caches do not serve one origin's headers to another origin.

**Follow-up:**

Why not reflect any Origin?

Answer: Blindly reflecting the origin together with credentials lets any website read authenticated responses. Check against an allowlist, using an exact match, not `endsWith`.

### NODE-231 — Trusting X-Forwarded headers

**Difficulty:** Senior

**Category:** Proxy

**Question:**

How should Node handle `X-Forwarded-*` headers behind a proxy?

**Answer:**

Behind a proxy, the address Node sees in `req.socket.remoteAddress` is the proxy's, not the client's. Proxies pass the client's details in `X-Forwarded-For`, `-Proto`, and `-Host`, or in the standardized `Forwarded` header. But these are ordinary headers that a client can set too. So trust them only when the direct peer is a known proxy.

**Follow-up:**

How do you pick the real client IP from `X-Forwarded-For`?

Answer: The list reads `client, proxy1, proxy2`, and the leftmost entry can be spoofed. Count the trusted hops from the right, or trust only configured proxy CIDR ranges, and take the first untrusted address.

### NODE-232 — trust proxy and raw Node equivalent

**Difficulty:** Intermediate

**Category:** Proxy

**Question:**

What does Express's `trust proxy` do, and what is the raw Node equivalent?

**Answer:**

`trust proxy` tells Express to derive `req.ip`, `req.protocol`, and `req.hostname` from `X-Forwarded-*` headers, but only for trusted hops. You configure it with a number, a list of CIDR ranges, or a function. Raw Node has no such feature. You implement the same logic yourself with `req.socket.remoteAddress` and header parsing.

**Follow-up:**

What breaks if it's misconfigured?

Answer: If it is too permissive, clients can spoof their IP, which defeats rate limits and audit logs. If it is too strict, secure cookies and redirects treat requests as plain HTTP, causing redirect loops, and all users appear to share the proxy's IP.

### NODE-233 — WebSocket upgrade handshake

**Difficulty:** Intermediate

**Category:** WebSocket

**Question:**

How does a WebSocket upgrade work in `node:http`?

**Answer:**

The client sends a `GET` request with `Connection: Upgrade`, `Upgrade: websocket`, and a `Sec-WebSocket-Key`. Node does not emit `'request'` for it. It emits `'upgrade'` on the server with `(req, socket, head)`. You reply with `101 Switching Protocols` and a `Sec-WebSocket-Accept` header, which is base64(SHA-1(key + GUID)). After that, you speak WebSocket frames on the raw socket. In practice, use the `ws` library.

**Follow-up:**

What happens if no `'upgrade'` listener exists?

Answer: Node closes the connection for upgrade requests, and the normal handler never sees them. The client sees a failed handshake.

### NODE-234 — Validating WebSocket upgrades

**Difficulty:** Senior

**Category:** WebSocket

**Question:**

What should you validate during a WebSocket upgrade?

**Answer:**

Authenticate the handshake, using a cookie or token, before you complete it. Check `Origin` against an allowlist, because browsers send it and CORS does not apply to WebSockets. Limit payload sizes, and handle socket `'error'` events. To reject an upgrade, write an HTTP error response manually and destroy the socket.

**Follow-up:**

Does Node 22 include a WebSocket server?

Answer: No. Node 22 ships a global WebSocket client (from undici). For a server you still need `ws` or something similar.

### NODE-235 — Server-Sent Events implementation

**Difficulty:** Intermediate

**Category:** SSE

**Question:**

How do you implement Server-Sent Events (SSE) in Node?

**Answer:**

Respond with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`, then call `res.flushHeaders()`. After that, write frames like `data: ...\n\n`, optionally with `id:`, `event:`, or `retry:` fields. The browser's `EventSource` reconnects automatically. SSE is one-way, from server to client, over plain HTTP.

**Follow-up:**

SSE vs WebSocket?

Answer: SSE is simpler, works through ordinary HTTP infrastructure, and reconnects automatically. But it is text-only and one-directional, and on HTTP/1.1 browsers limit it to about 6 connections per domain. WebSocket is bidirectional and supports binary data.

### NODE-236 — SSE operational issues

**Difficulty:** Senior

**Category:** SSE

**Question:**

What operational issues affect SSE?

**Answer:**

Proxies may buffer or compress the stream; set `X-Accel-Buffering: no` and disable compression. Idle timeouts can cut connections, so send `: ping` comment heartbeats every 15–30 seconds. Support `Last-Event-ID` so clients can resume, and clean up in `res.on('close')`. Also respect backpressure: if `res.write` returns `false`, drop or queue messages for that client.

**Follow-up:**

How to resume after reconnect?

Answer: Browsers send `Last-Event-ID`. Keep a bounded replay buffer keyed by event id and send the missed events, or tell the client to resync through an API call.

### NODE-237 — What server.close does

**Difficulty:** Intermediate

**Category:** Shutdown

**Question:**

What does `server.close()` actually do?

**Answer:**

`server.close()` stops the server from accepting new connections, and calls its callback once all existing connections have ended. It does not forcibly close active sockets. With keep-alive, idle connections can keep the server open for a long time unless they are closed.

**Follow-up:**

Why did older Node servers "hang" on close?

Answer: Idle keep-alive sockets stayed open until their timeout. In Node 19+, `close()` also closes idle connections. But in-flight requests and long-lived SSE or WebSocket sockets still keep it waiting.

### NODE-238 — closeIdleConnections and closeAllConnections

**Difficulty:** Intermediate

**Category:** Shutdown

**Question:**

What are `closeIdleConnections()` and `closeAllConnections()`?

**Answer:**

Both were added in v18.2. `server.closeIdleConnections()` closes sockets that have no active request. `server.closeAllConnections()` destroys every socket, including those with active requests. They are essential for graceful shutdown and for test teardown.

**Follow-up:**

When use the aggressive one?

Answer: Only after your drain deadline has expired, as a last resort. Otherwise users get truncated responses.

### NODE-239 — Graceful HTTP shutdown

**Difficulty:** Senior

**Category:** Shutdown

**Question:**

Describe a proper graceful shutdown for an HTTP service.

**Answer:**

On `SIGTERM`, first fail the readiness probe, then call `server.close()` to stop accepting connections. Set `Connection: close` on in-flight responses, and wait for requests to finish, for example with an in-flight counter. Call `closeIdleConnections()`, then close databases and queues. Set a hard timeout, such as 10–25 s, below the orchestrator's `terminationGracePeriodSeconds`. When it expires, call `closeAllConnections()` and exit.

**Follow-up:**

Why wait before calling `server.close()` in Kubernetes?

Answer: Removing the endpoint takes time to propagate. A few seconds of delay, such as a preStop sleep, lets load balancers stop routing traffic to you before you refuse new connections.

### NODE-240 — Draining long-lived connections

**Difficulty:** Senior

**Category:** Shutdown

**Question:**

How do you drain long-lived connections (SSE/WebSocket) at shutdown?

**Answer:**

Keep track of them in a set. At shutdown, send a final message or close frame (WebSocket code 1001 Going Away, or an SSE `retry` followed by the end of the stream), then call `end()` on them. Clients should reconnect to another instance with backoff, so they do not all return at once.

**Follow-up:**

Why add jitter?

Answer: Without randomness, all clients reconnect at the same moment and overload the remaining instances during a rolling deploy.

### NODE-241 — Expect: 100-continue

**Difficulty:** Intermediate

**Category:** 100-continue

**Question:**

What is `Expect: 100-continue` and how does Node handle it?

**Answer:**

A client sends the headers with `Expect: 100-continue` and waits for a `100 Continue` reply before sending the, usually large, body. This lets the server reject the request early. By default, Node answers `100 Continue` automatically and emits `'request'`. If you register `server.on('checkContinue', (req, res) => ...)`, you must call `res.writeContinue()` yourself, or send a final error status.

**Follow-up:**

Why is this useful for uploads?

Answer: You can reject unauthorized or too-large uploads with `401` or `413` without receiving the body, which saves bandwidth. Note that many clients give up waiting after about a second (curl does) and send the body anyway.

### NODE-242 — Other Expect values

**Difficulty:** Senior

**Category:** 100-continue

**Question:**

What about other `Expect` values?

**Answer:**

For any `Expect` value other than `100-continue`, Node emits `'checkExpectation'` if you have a listener. Without a listener, it replies `417 Expectation Failed`. This is rarely used, but it lets you implement custom expectation handling.

**Follow-up:**

What status does a server use when it can't meet an expectation?

Answer: `417 Expectation Failed`. The client should then retry without the `Expect` header.

### NODE-243 — Range requests and 206

**Difficulty:** Intermediate

**Category:** Range requests

**Question:**

How do range requests work and what must a Node file server send?

**Answer:**

The client sends a header like `Range: bytes=0-1023`. The server replies `206 Partial Content` with `Content-Range: bytes 0-1023/5000` and the correct `Content-Length`. On normal responses, it advertises support with `Accept-Ranges: bytes`. For an invalid range, it replies `416 Range Not Satisfiable` with `Content-Range: bytes */5000`.

**Follow-up:**

Why do video players depend on this?

Answer: Seeking and buffering use byte-range requests. Without 206 support, the player has to download from the start.

### NODE-244 — Serving ranges with streams and If-Range

**Difficulty:** Senior

**Category:** Range requests

**Question:**

How do you serve a range with streams, and what is `If-Range`?

**Answer:**

Parse the header and validate that `start <= end < size`, handling suffix ranges like `-500` and open-ended ranges like `500-`. Then use `fs.createReadStream(path, { start, end })` and pipe it to `res` with `pipeline`. `If-Range` carries an ETag or date. If it no longer matches the file, ignore the range and send the full 200 response, so a resumed download is not corrupted.

**Follow-up:**

Multiple ranges?

Answer: They require a `multipart/byteranges` response. Most servers just send the full content or the first range. Attackers can abuse many overlapping ranges for denial of service, so cap the number.

### NODE-245 — Security headers at the HTTP layer

**Difficulty:** Intermediate

**Category:** Security headers

**Question:**

Which security headers should an HTTP response set, and what does each do?

**Answer:**

- `Strict-Transport-Security` forces HTTPS; send it only over HTTPS.
- `X-Content-Type-Options: nosniff` stops browsers from guessing content types.
- `Content-Security-Policy` restricts script, style, and frame sources; its `frame-ancestors` directive replaces `X-Frame-Options`.
- `Referrer-Policy` and `Permissions-Policy` limit what the browser leaks and which features pages can use.
- Cross-origin policies (`COOP`, `CORP`) isolate your pages and resources.

Also remove fingerprinting headers like `X-Powered-By`.

**Follow-up:**

Where do you set them, app or proxy?

Answer: Choose one consistent place: a proxy or CDN for static policy, or middleware like Helmet in the app. Avoid duplicates, and test CSP in report-only mode first.

### NODE-246 — ETag, Last-Modified, and 304

**Difficulty:** Intermediate

**Category:** Caching

**Question:**

How do `ETag`, `Last-Modified`, and `304 Not Modified` work in Node?

**Answer:**

The server sends `ETag` and/or `Last-Modified`. Clients later revalidate with `If-None-Match` or `If-Modified-Since`. If the content is unchanged, the server responds `304` with no body; Node strips bodies for 304, 204, and HEAD responses. Combine this with `Cache-Control` (`max-age`, `immutable`, `no-store`) to get correct caching.

**Follow-up:**

`no-cache` vs `no-store`?

Answer: `no-cache` allows storing the response but requires revalidation every time. `no-store` forbids storing it at all. Use `no-store` for sensitive responses.

### NODE-247 — HEAD and bodiless statuses

**Difficulty:** Junior

**Category:** Semantics

**Question:**

How does Node treat `HEAD` and bodiless statuses?

**Answer:**

For `HEAD`, Node sends the headers and discards any body you write, though you can still set `Content-Length`. Responses with status 204, 205, and 304 also have no body; writing one is ignored or causes an error. Your handler should still compute the same headers for HEAD as it would for GET.

**Follow-up:**

Common bug?

Answer: Returning `204` with a JSON body, or setting a wrong `Content-Length`, makes clients hang or fail to parse. Send nothing for 204.

### NODE-248 — clientError and malformed requests

**Difficulty:** Intermediate

**Category:** Errors

**Question:**

How do you handle malformed requests and `'clientError'`?

**Answer:**

Parser errors, such as bad syntax or oversized headers, emit `'clientError'` on the server with `(err, socket)`. By default, Node responds `400 Bad Request` and destroys the socket. If you add your own listener, you must write a response yourself and end or destroy the socket, or it leaks.

**Follow-up:**

What about errors on `req` itself?

Answer: `req` can emit `'error'`, for example for an aborted connection or `ECONNRESET`. Without a listener, that is thrown as an uncaught exception. Use `pipeline` or add handlers.

### NODE-249 — maxHeaderSize and 431

**Difficulty:** Intermediate

**Category:** Limits

**Question:**

What is `maxHeaderSize` and what happens when it's exceeded?

**Answer:**

The default maximum total header size is 16 KiB. You can change it with `--max-http-header-size` or the `maxHeaderSize` server option. Larger headers are rejected with `431 Request Header Fields Too Large`, or the connection is closed. In practice, oversized cookies are a frequent cause.

**Follow-up:**

Should you just raise it?

Answer: Prefer reducing the cookie or header size. Raising the limit increases memory use per connection and the attack surface, and proxies often have their own lower limits anyway.

### NODE-250 — Defending against slow and abusive clients

**Difficulty:** Senior

**Category:** Hardening

**Question:**

How do you defend a bare Node HTTP server against slow or abusive clients?

**Answer:**

Combine several layers: `headersTimeout`, `requestTimeout`, `keepAliveTimeout`, `server.maxConnections`, and `maxRequestsPerSocket` (to rotate connections). Add body size limits, and put a proxy or WAF with rate limiting in front. Handle backpressure and cancel work on `close`. Keep Node updated for parser and HTTP/2 security fixes.

**Follow-up:**

What does `maxRequestsPerSocket` do?

Answer: After N requests on one keep-alive connection, Node sends `Connection: close`, which forces the client to reconnect. This helps rebalance load and bound per-connection state. The default `0` means unlimited.
