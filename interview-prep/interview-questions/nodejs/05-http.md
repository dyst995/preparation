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

It returns an `http.Server` (a `net.Server` subclass) that parses HTTP/1.1 with llhttp and emits `'request'` with `(req, res)` for each message. `req` is an `IncomingMessage` (Readable) and `res` is a `ServerResponse` (Writable). You still must call `server.listen()`; there is no routing, body parsing, or error handling built in.

**Follow-up:**

Does the listener run once per connection or per request?

Answer: Per request. One TCP connection can carry many sequential requests with keep-alive (or many concurrent streams in HTTP/2), so never store per-user state on the socket without cleaning it up.

### NODE-202 — req and res as streams

**Difficulty:** Junior

**Category:** req and res streams

**Question:**

Why are `req` and `res` streams, and what does that change in practice?

**Answer:**

`req` is a Readable of the body and `res` is a Writable for the response. You can `pipeline(req, transform, destination)` for uploads and `pipeline(source, res)` for downloads without buffering everything in memory. Backpressure works through `res.write()` returning `false` and the `'drain'` event.

**Follow-up:**

What happens if you ignore the request body?

Answer: If the body is never consumed (`req.resume()` or reading it), the connection may stall for keep-alive reuse, since the parser cannot move to the next message. Node tries to dump unread bodies after the response ends, but be explicit for large uploads and use `req.destroy()` if you reject.

### NODE-203 — Request headers in Node

**Difficulty:** Junior

**Category:** Headers

**Question:**

How does Node expose request headers, and what are the gotchas?

**Answer:**

`req.headers` is an object with lowercased names. Duplicate headers are joined with `, ` for most, but `set-cookie` is always an array, and some singletons (e.g. `content-type`, `host`) keep the first value. `req.rawHeaders` preserves original case and duplicates as a flat array; `req.headersDistinct` (v18.3+) gives arrays per name.

**Follow-up:**

Why can header handling cause security bugs?

Answer: Code that assumes a string may receive an array (`x-forwarded-for` duplicates, cookies), breaking validation or enabling spoofing. Normalize explicitly and never trust header casing or counts.

### NODE-204 — setHeader vs writeHead and headersSent

**Difficulty:** Intermediate

**Category:** Headers

**Question:**

What is the difference between `res.setHeader` and `res.writeHead`, and what is `headersSent`?

**Answer:**

`setHeader` queues headers that can be changed until the first byte is flushed; `writeHead(status, headers)` sets status and headers and flushes them implicitly on first write. Headers passed to `writeHead` win over `setHeader`. After headers are sent, `res.headersSent` is `true` and `setHeader` throws `ERR_HTTP_HEADERS_SENT`.

**Follow-up:**

How do you handle an error after streaming started?

Answer: You cannot change the status code any more. Destroy the response (`res.destroy(err)`) so the client sees a broken stream, and log it. Do not try to write a JSON error into a half-sent body.

### NODE-205 — HTTP trailers

**Difficulty:** Senior

**Category:** Trailers

**Question:**

What are HTTP trailers and how do you use them in Node?

**Answer:**

Trailers are headers sent after the body in a chunked message. On the server: declare with a `Trailer` header, then call `res.addTrailers({...})` before `res.end()`. On the incoming side, `req.trailers` is populated only after `'end'`. Typical use: checksums or final status of a streamed response.

**Follow-up:**

Why are trailers rarely used?

Answer: They require chunked encoding (or HTTP/2), and many proxies, browsers' `fetch` APIs, and frameworks drop or ignore them. gRPC is the main user (over HTTP/2).

### NODE-206 — Server keep-alive and keepAliveTimeout

**Difficulty:** Intermediate

**Category:** Keep-alive

**Question:**

How does HTTP keep-alive work on the Node server, and what is `keepAliveTimeout`?

**Answer:**

HTTP/1.1 connections persist by default. After a response, the server keeps the socket idle for `server.keepAliveTimeout` (default 5000 ms) waiting for another request, then closes it. Node sends `Keep-Alive: timeout=5` so well-behaved clients know.

**Follow-up:**

Why do 502s appear behind an AWS ALB/nginx?

Answer: If the upstream (Node) closes idle sockets sooner than the proxy's idle timeout, the proxy may reuse a socket Node just closed, producing resets/502s. Set `keepAliveTimeout` greater than the proxy idle timeout (e.g. ALB 60s → 65s) and `headersTimeout` above that.

### NODE-207 — headersTimeout and requestTimeout

**Difficulty:** Senior

**Category:** Timeouts

**Question:**

Explain `headersTimeout`, `requestTimeout`, and their defaults.

**Answer:**

`headersTimeout` (default 60 s) limits how long the server waits for the full request headers to arrive. `requestTimeout` (default 300 s since v18) limits the time to receive the entire request, headers plus body. Exceeding either closes the connection (408/destroy). `connectionsCheckingInterval` (default 30 s) controls how often these are checked.

**Follow-up:**

Which of these protects against Slowloris?

Answer: Both, together with `maxConnections` and a front proxy. Lower `requestTimeout` if you have no large uploads; raise it for slow-upload endpoints or handle those with streaming and per-route logic.

### NODE-208 — server.timeout and socket timeouts

**Difficulty:** Intermediate

**Category:** Timeouts

**Question:**

What does `server.timeout` / `socket.setTimeout` do?

**Answer:**

`server.timeout` is the socket inactivity timeout; default is `0` (disabled) since Node 13. When set, an idle socket emits `'timeout'`, and if there is no listener the socket is destroyed. `req.setTimeout` / `res.setTimeout` are per-request wrappers around the same socket timeout.

**Follow-up:**

Is it a total request deadline?

Answer: No — it resets on every socket activity. For a hard deadline use an `AbortController` + `setTimeout`/`AbortSignal.timeout()` in your handler and downstream calls.

### NODE-209 — Request body size limits

**Difficulty:** Intermediate

**Category:** Body limits

**Question:**

How do you enforce a request body size limit in raw Node?

**Answer:**

Check `Content-Length` first and reply `413` early if too big, but never trust it alone since chunked bodies have no length. Count bytes as they stream (a `Transform` or `req.on('data')`) and abort when exceeding the limit, then respond 413 with `Connection: close` and destroy the request.

**Follow-up:**

Why is `JSON.parse` of the whole body dangerous without limits?

Answer: Buffering unbounded input causes memory exhaustion and event-loop-blocking parse time. Cap bytes before buffering, and also consider depth/size limits on the parsed structure.

### NODE-210 — Chunked transfer encoding

**Difficulty:** Intermediate

**Category:** Chunked transfer

**Question:**

What is chunked transfer encoding and when does Node use it?

**Answer:**

It frames a body as size-prefixed chunks terminated by a zero chunk, so length need not be known upfront. Node uses it automatically for HTTP/1.1 responses when you `write()` without setting `Content-Length`, and for client requests with a streamed body. HTTP/2 has its own framing and forbids `Transfer-Encoding`.

**Follow-up:**

How can you disable chunking for a response?

Answer: Set `Content-Length` before writing (and write exactly that many bytes), or buffer and `res.end(body)` — Node then sets `Content-Length` itself for a single-shot `end`.

### NODE-211 — Request smuggling and the HTTP parser

**Difficulty:** Senior

**Category:** Security

**Question:**

What is HTTP request smuggling and how does Node relate to it?

**Answer:**

Smuggling exploits disagreements between a front proxy and the backend about message boundaries (`Content-Length` vs `Transfer-Encoding`). Node's llhttp parser is strict (rejects invalid chunk syntax and conflicting framing in current versions), but you must keep Node patched and put it behind consistent proxies.

**Follow-up:**

What Node flag is a red flag?

Answer: `--insecure-http-parser` (or `insecureHTTPParser: true`) relaxes parsing for broken peers and reopens smuggling risks. Never use it in production exposed to untrusted input.

### NODE-212 — HTTPS server and TLS termination

**Difficulty:** Junior

**Category:** HTTPS

**Question:**

How do you create an HTTPS server and what is usually done in production instead?

**Answer:**

`https.createServer({ key, cert }, handler)` wraps TLS around the HTTP parser using OpenSSL. In production, TLS is commonly terminated at a load balancer or reverse proxy (nginx, Envoy, ALB), and Node speaks plain HTTP on a private network, which simplifies cert rotation and offloads CPU.

**Follow-up:**

How do you rotate certs without restart?

Answer: Call `server.setSecureContext({ key, cert })` with new material (e.g. on file change or SIGHUP). New connections use it; existing ones continue.

### NODE-213 — TLS options and certificate verification

**Difficulty:** Intermediate

**Category:** HTTPS

**Question:**

What TLS options matter for HTTPS clients/servers?

**Answer:**

Server: `minVersion` (default TLSv1.2), `ciphers`, `ca` + `requestCert` for mTLS, `SNICallback` for per-host certs. Client: `ca` for private CAs, `servername`, and `rejectUnauthorized` (default `true`). Pin or add a custom CA instead of disabling verification.

**Follow-up:**

Why is `NODE_TLS_REJECT_UNAUTHORIZED=0` dangerous?

Answer: It disables certificate validation process-wide, making MITM trivial and silently affecting every outbound call. Use `NODE_EXTRA_CA_CERTS` or per-request `ca` for self-signed dev certs.

### NODE-214 — HTTP/2 multiplexing vs HTTP/1.1

**Difficulty:** Intermediate

**Category:** HTTP/2

**Question:**

How does HTTP/2 multiplexing differ from HTTP/1.1 keep-alive?

**Answer:**

HTTP/2 runs many concurrent streams over a single TCP connection with binary framing, header compression (HPACK), and per-stream flow control. HTTP/1.1 handles one in-flight request per connection (no practical pipelining), so clients open several connections. HTTP/2 removes application-level head-of-line blocking, though TCP-level HOL remains (fixed by HTTP/3/QUIC).

**Follow-up:**

Does it make one connection always faster?

Answer: Not always: on lossy networks a single TCP connection suffers from packet-loss HOL blocking across all streams. Also, server resources per connection (flow control windows, stream limits) need tuning.

### NODE-215 — HTTP/2 server and HTTP/1.1 fallback

**Difficulty:** Senior

**Category:** HTTP/2

**Question:**

How do you build an HTTP/2 server in Node and keep HTTP/1.1 clients working?

**Answer:**

`http2.createSecureServer({ key, cert, allowHTTP1: true })` and listen for `'stream'` (core API) or `'request'` (Compatibility API with `req`/`res`). Browsers only speak h2 over TLS (ALPN `h2`). With `allowHTTP1`, clients that negotiate `http/1.1` fall back to the regular request path.

**Follow-up:**

What is a common operational risk with HTTP/2?

Answer: Abuse like Rapid Reset (CVE-2023-44487) and excessive stream/settings floods. Keep Node patched, limit `maxConcurrentStreams`/session memory, and terminate h2 at a hardened proxy where possible.

### NODE-216 — Detecting client disconnects

**Difficulty:** Intermediate

**Category:** Lifecycle

**Question:**

How do you detect client disconnects and stop work?

**Answer:**

Listen to `res.on('close')` and check `res.writableEnded`; if `close` fires before the response ended, the client went away. `req.on('close')` also fires after the request body and, on newer Node, `req.destroyed` helps. The legacy `'aborted'` event is deprecated. Wire an `AbortController` to cancel DB/HTTP work.

**Follow-up:**

Why does this matter for SSE or long polling?

Answer: Without cleanup you leak timers, subscriptions, and memory per dead client. Always remove listeners and clear intervals in the `close` handler.

### NODE-217 — Global fetch and undici

**Difficulty:** Junior

**Category:** fetch

**Question:**

What is global `fetch` in Node 20/22 and what powers it?

**Answer:**

`fetch`, `Request`, `Response`, `Headers`, `FormData` are globals backed by a bundled copy of undici (Node 18 experimental, stable from 21; fully usable in 20/22). It follows the WHATWG Fetch API with web streams for bodies, and runs on undici's connection pool, not on `http.Agent`.

**Follow-up:**

Can you use `http.Agent` options with `fetch`?

Answer: No. Configure undici's `Agent`/dispatcher instead (via the `dispatcher` option, which Node's bundled fetch accepts when you import `undici` of a compatible version).

### NODE-218 — undici Agent and pooling

**Difficulty:** Intermediate

**Category:** undici

**Question:**

What is an undici `Agent` and why configure it?

**Answer:**

`new Agent({ connections, pipelining, keepAliveTimeout, keepAliveMaxTimeout, connect: { timeout } })` manages pools per origin. Tuning controls max parallel sockets, idle reuse, and connection timeouts. Use `fetch(url, { dispatcher })` or `setGlobalDispatcher(agent)` for all fetch calls.

**Follow-up:**

What does `pipelining` do?

Answer: It lets multiple HTTP/1.1 requests be queued on a socket without waiting. Default is 1 (off effectively), because pipelining suffers HOL blocking and has proxy compatibility problems; keep it at 1 unless you control both ends.

### NODE-219 — Global dispatcher, proxy, and defaults

**Difficulty:** Intermediate

**Category:** undici

**Question:**

How do you set global fetch defaults, such as a proxy or custom CA?

**Answer:**

Create a dispatcher (`Agent`, `ProxyAgent`, or `Agent({ connect: { ca } })`) and call `setGlobalDispatcher`. `ProxyAgent` handles CONNECT tunnelling to an HTTP proxy. Node does not read `HTTP_PROXY` for `fetch` by default (newer versions add opt-in `NODE_USE_ENV_PROXY`).

**Follow-up:**

Where do you find defaults like timeouts?

Answer: undici defaults: connect timeout 10 s, headersTimeout and bodyTimeout 300 s, keepAliveTimeout 4 s. Lower them for service-to-service calls.

### NODE-220 — http.Agent keep-alive and pooling

**Difficulty:** Intermediate

**Category:** http.Agent

**Question:**

How does `http.Agent` keep-alive work for `http.request`?

**Answer:**

`http.globalAgent` has `keepAlive: true` since Node 19, with a default idle timeout of 5 s. Earlier versions created a new connection per request unless you passed your own `new http.Agent({ keepAlive: true })`. `maxSockets` caps concurrent connections per host (default `Infinity`), `maxFreeSockets` caps idle ones.

**Follow-up:**

What leaks if you don't reuse agents?

Answer: Creating an agent per request means no pooling, port exhaustion (`TIME_WAIT`), and slow TLS handshakes. Share a module-level agent.

### NODE-221 — AbortSignal with fetch and http.request

**Difficulty:** Intermediate

**Category:** AbortSignal

**Question:**

How does `AbortSignal` work with `fetch` and with `http.request`?

**Answer:**

Pass `signal` in `fetch(url, { signal })`; aborting rejects with `AbortError` (or the signal's `reason`). `http.request(url, { signal })` is supported too and destroys the request with an `AbortError`. `AbortSignal.timeout(ms)` creates a signal that aborts with `TimeoutError`; `AbortSignal.any([a, b])` combines signals.

**Follow-up:**

Does aborting cancel server-side work?

Answer: Only indirectly: the TCP connection/stream is closed, and a well-written server notices via `close` and stops. It's not an RPC cancel, so non-idempotent operations may still complete.

### NODE-222 — Timeouts on fetch calls

**Difficulty:** Senior

**Category:** fetch

**Question:**

What timeouts exist on a `fetch` call, and what is missing?

**Answer:**

undici applies connect (10 s), headers (300 s), and body (300 s) timeouts by default, which are too generous for many services. There is no single "total timeout" option other than `AbortSignal.timeout()`. Use both: signal for the overall deadline, dispatcher options for stalls.

**Follow-up:**

Does `AbortSignal.timeout` cover reading the body?

Answer: Yes, if you read the body while the signal is still active, abort will error the stream. Note that after the response is fully consumed, the timer no longer matters.

### NODE-223 — fetch and HTTP error statuses

**Difficulty:** Junior

**Category:** fetch

**Question:**

Does `fetch` reject on HTTP 404/500?

**Answer:**

No. It rejects only on network failures, aborts, or invalid setup (`TypeError: fetch failed` with `cause`). For 4xx/5xx you get a resolved `Response` with `ok === false`; check `res.ok`/`res.status` and handle bodies yourself.

**Follow-up:**

Where is the real error?

Answer: In `err.cause` (e.g. `ECONNREFUSED`, `UND_ERR_CONNECT_TIMEOUT`). Log `cause`, not just the generic message.

### NODE-224 — Consuming or cancelling fetch bodies

**Difficulty:** Senior

**Category:** fetch

**Question:**

Why must you consume or cancel a fetch response body?

**Answer:**

Undici holds the connection until the body is read or cancelled. If you ignore it (e.g. only check `status`), the socket may not be returned to the pool until GC, causing connection starvation or memory pressure. Call `await res.arrayBuffer()`/`res.text()`, or `res.body?.cancel()`, even on error paths.

**Follow-up:**

How do you stream a large response?

Answer: Iterate `res.body` (a web ReadableStream, async iterable in Node) or convert with `Readable.fromWeb(res.body)` and `pipeline` to disk/response.

### NODE-225 — fetch redirect handling

**Difficulty:** Intermediate

**Category:** Redirects

**Question:**

How does `fetch` handle redirects?

**Answer:**

`redirect: 'follow'` (default) follows up to 20 redirects; `'manual'` returns the 3xx response for you to handle (in Node you can read `Location`); `'error'` rejects. 301/302 on POST switch to GET, while 307/308 preserve method and body. The `Authorization` header is dropped on cross-origin redirects.

**Follow-up:**

Why consider `redirect: 'manual'` on server-side fetch?

Answer: SSRF protection: a validated public URL can redirect to `http://169.254.169.254` or internal hosts. Validate each hop's destination yourself.

### NODE-226 — http.request and redirects

**Difficulty:** Intermediate

**Category:** Redirects

**Question:**

Does `http.request` follow redirects?

**Answer:**

No. The core `http`/`https` clients return the 3xx response and leave the `Location` handling to you (libraries like `follow-redirects` or got/axios add it). Fetch/undici's fetch follows by spec; undici's low-level `request()` does not unless you add the redirect interceptor.

**Follow-up:**

What must you do with a redirect response's body?

Answer: Consume or destroy it (`res.resume()`) to free the socket before issuing the next request.

### NODE-227 — Compressing HTTP responses

**Difficulty:** Intermediate

**Category:** Compression

**Question:**

How do you compress HTTP responses in Node?

**Answer:**

Read `Accept-Encoding`, pick `br`/`gzip`/`deflate`, set `Content-Encoding` and `Vary: Accept-Encoding`, remove `Content-Length`, and `pipeline(source, zlib.createGzip(), res)`. Compress only compressible types (JSON, text, HTML), skip images/already-compressed, and prefer pre-compressed static assets or compress at the proxy/CDN.

**Follow-up:**

Any security concern?

Answer: BREACH: compressing responses that reflect secrets (CSRF tokens) plus attacker-controlled input can leak them. Also compression is CPU-heavy on the event loop's threadpool; set limits.

### NODE-228 — fetch and compressed bodies

**Difficulty:** Intermediate

**Category:** Compression

**Question:**

How does fetch deal with compressed responses and how do you send compressed requests?

**Answer:**

Undici's fetch sends `Accept-Encoding` and automatically decodes `gzip`, `deflate`, and `br` response bodies (so `res.text()` returns plain text). For request bodies you compress yourself (`zlib`/`CompressionStream`) and set `Content-Encoding`; servers must explicitly support it.

**Follow-up:**

Why is `Content-Length` sometimes misleading with fetch?

Answer: It reflects the encoded size, not the decoded one, so don't use it for size limits on decoded data; guard against decompression bombs by capping decoded bytes.

### NODE-229 — CORS headers and preflight

**Difficulty:** Junior

**Category:** CORS

**Question:**

How is CORS an HTTP-layer concern, and what does a preflight look like?

**Answer:**

CORS is enforced by browsers using response headers (`Access-Control-Allow-Origin`, `-Methods`, `-Headers`, `-Max-Age`, `-Expose-Headers`). For non-simple requests, the browser first sends `OPTIONS` with `Origin`, `Access-Control-Request-Method/Headers`; the server must reply 204 with proper headers before the real call.

**Follow-up:**

Does CORS protect your server?

Answer: No. It only restricts what browser JS may read. `curl` and servers ignore it, so you still need authentication and CSRF protections.

### NODE-230 — CORS credentials and Vary

**Difficulty:** Intermediate

**Category:** CORS

**Question:**

What are the CORS pitfalls with credentials and caching?

**Answer:**

With `credentials: 'include'` the server cannot respond `Access-Control-Allow-Origin: *`; it must echo a specific allowed origin and send `Access-Control-Allow-Credentials: true`. When echoing the origin, always add `Vary: Origin` so caches don't serve one origin's headers to another.

**Follow-up:**

Why not reflect any Origin?

Answer: Blind reflection with credentials lets any site read authenticated responses. Validate against an allowlist (exact match, not `endsWith`).

### NODE-231 — Trusting X-Forwarded headers

**Difficulty:** Senior

**Category:** Proxy

**Question:**

How should Node handle `X-Forwarded-*` headers behind a proxy?

**Answer:**

The client IP seen by Node is the proxy's (`req.socket.remoteAddress`). Proxies add `X-Forwarded-For`, `-Proto`, `-Host` (or standardized `Forwarded`). These are plain client-controlled headers, so only trust them when the immediate peer is a known proxy.

**Follow-up:**

How do you pick the real client IP from `X-Forwarded-For`?

Answer: The list is `client, proxy1, proxy2`; the leftmost can be spoofed. Count trusted hops from the right (or trust only configured proxy CIDRs) and take the first untrusted address.

### NODE-232 — trust proxy and raw Node equivalent

**Difficulty:** Intermediate

**Category:** Proxy

**Question:**

What does Express's `trust proxy` do, and what is the raw Node equivalent?

**Answer:**

It tells Express to derive `req.ip`, `req.protocol`, `req.hostname` from `X-Forwarded-*` for trusted hops (a number, CIDR list, or function). Raw Node has no such concept: you implement the same logic with `req.socket.remoteAddress` and header parsing.

**Follow-up:**

What breaks if it's misconfigured?

Answer: Too permissive: IP spoofing defeats rate limits and audit logs. Too strict: secure cookies/redirects treat requests as HTTP, causing redirect loops, and all users share the proxy IP.

### NODE-233 — WebSocket upgrade handshake

**Difficulty:** Intermediate

**Category:** WebSocket

**Question:**

How does a WebSocket upgrade work in `node:http`?

**Answer:**

The client sends `GET` with `Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Key`. Node does not emit `'request'`; it emits `'upgrade'` on the server with `(req, socket, head)`. You reply `101 Switching Protocols` with `Sec-WebSocket-Accept` = base64(SHA-1(key + GUID)), and then speak WebSocket frames on the raw socket. In practice use `ws`.

**Follow-up:**

What happens if no `'upgrade'` listener exists?

Answer: Node closes the connection for upgrade requests (the request is not given to the normal handler), so the client sees a failed handshake.

### NODE-234 — Validating WebSocket upgrades

**Difficulty:** Senior

**Category:** WebSocket

**Question:**

What should you validate during a WebSocket upgrade?

**Answer:**

Authenticate the handshake (cookie/token) before completing it, check `Origin` against an allowlist (browsers send it and no CORS applies), limit payload sizes, and handle socket `'error'` events. Destroy the socket on rejected upgrades with an HTTP error response written manually.

**Follow-up:**

Does Node 22 include a WebSocket server?

Answer: No. Node 22 ships a global WebSocket client (undici); servers still need `ws` or similar.

### NODE-235 — Server-Sent Events implementation

**Difficulty:** Intermediate

**Category:** SSE

**Question:**

How do you implement Server-Sent Events (SSE) in Node?

**Answer:**

Respond with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, call `res.flushHeaders()`, then write `data: ...\n\n` frames (optionally `id:`, `event:`, `retry:`). The browser `EventSource` reconnects automatically. It is one-way (server → client) over plain HTTP.

**Follow-up:**

SSE vs WebSocket?

Answer: SSE is simpler, works through HTTP infra and auto-reconnects, but is text-only and unidirectional (and limits ~6 connections/domain on HTTP/1.1). WebSocket is bidirectional and binary.

### NODE-236 — SSE operational issues

**Difficulty:** Senior

**Category:** SSE

**Question:**

What operational issues affect SSE?

**Answer:**

Proxies buffering or compressing the stream (set `X-Accel-Buffering: no`, disable compression), idle timeouts (send `: ping` comment heartbeats every 15–30 s), `Last-Event-ID` for resume, and cleanup on `res.on('close')`. Respect backpressure: if `res.write` returns `false`, drop or queue per client.

**Follow-up:**

How to resume after reconnect?

Answer: Browsers send `Last-Event-ID`; keep a bounded replay buffer keyed by event id and send missed events, or tell the client to resync via an API call.

### NODE-237 — What server.close does

**Difficulty:** Intermediate

**Category:** Shutdown

**Question:**

What does `server.close()` actually do?

**Answer:**

It stops accepting new connections and calls its callback once all existing connections have ended. It does not forcibly close active sockets. With keep-alive, idle connections can keep it open for a long time unless they are closed.

**Follow-up:**

Why did older Node servers "hang" on close?

Answer: Idle keep-alive sockets stayed open until their timeout. Node 19+ makes `close()` also close idle connections, but in-flight requests and long-lived SSE/WebSocket sockets still block it.

### NODE-238 — closeIdleConnections and closeAllConnections

**Difficulty:** Intermediate

**Category:** Shutdown

**Question:**

What are `closeIdleConnections()` and `closeAllConnections()`?

**Answer:**

Added in v18.2: `server.closeIdleConnections()` closes sockets with no active request; `server.closeAllConnections()` destroys everything, including active requests. They're essential for graceful shutdown and test teardown.

**Follow-up:**

When use the aggressive one?

Answer: Only after a drain deadline expires, as a last resort; otherwise users get truncated responses.

### NODE-239 — Graceful HTTP shutdown

**Difficulty:** Senior

**Category:** Shutdown

**Question:**

Describe a proper graceful shutdown for an HTTP service.

**Answer:**

On `SIGTERM`: fail readiness probes, stop accepting (`server.close()`), set `Connection: close` on in-flight responses, wait for requests to finish (track an in-flight counter), call `closeIdleConnections()`, then close DB/queues. Apply a hard timeout (e.g. 10–25 s under the orchestrator's `terminationGracePeriodSeconds`), after which `closeAllConnections()` and exit.

**Follow-up:**

Why wait before calling `server.close()` in Kubernetes?

Answer: The endpoint removal propagates asynchronously; a few seconds of delay (preStop sleep) lets load balancers stop routing before you refuse new connections.

### NODE-240 — Draining long-lived connections

**Difficulty:** Senior

**Category:** Shutdown

**Question:**

How do you drain long-lived connections (SSE/WebSocket) at shutdown?

**Answer:**

Track them in a set, send a final event or close frame (WebSocket 1001 Going Away; SSE `retry` + end), and `end()` them. Clients should reconnect to another instance with backoff to avoid thundering herd.

**Follow-up:**

Why add jitter?

Answer: Without randomness all clients reconnect simultaneously to remaining instances, overloading them during rolling deploys.

### NODE-241 — Expect: 100-continue

**Difficulty:** Intermediate

**Category:** 100-continue

**Question:**

What is `Expect: 100-continue` and how does Node handle it?

**Answer:**

A client sends headers with `Expect: 100-continue` and waits for `100 Continue` before sending the (large) body, allowing the server to reject early. By default Node auto-replies with `100 Continue` and emits `'request'`. If you register `server.on('checkContinue', (req, res) => ...)`, you must call `res.writeContinue()` yourself or send a final error status.

**Follow-up:**

Why is this useful for uploads?

Answer: Reject unauthorized or too-large uploads (`401`, `413`) without receiving the body, saving bandwidth. Note many clients timeout (~1 s in curl) and send anyway.

### NODE-242 — Other Expect values

**Difficulty:** Senior

**Category:** 100-continue

**Question:**

What about other `Expect` values?

**Answer:**

For `Expect` values other than `100-continue`, Node emits `'checkExpectation'` if you have a listener; without one it replies `417 Expectation Failed`. Rarely used, but it lets you implement custom expectation handling.

**Follow-up:**

What status does a server use when it can't meet an expectation?

Answer: `417 Expectation Failed`; the client should retry without the `Expect` header.

### NODE-243 — Range requests and 206

**Difficulty:** Intermediate

**Category:** Range requests

**Question:**

How do range requests work and what must a Node file server send?

**Answer:**

Client sends `Range: bytes=0-1023`. Server replies `206 Partial Content` with `Content-Range: bytes 0-1023/5000`, correct `Content-Length`, and advertises `Accept-Ranges: bytes` on normal responses. Invalid ranges get `416 Range Not Satisfiable` with `Content-Range: bytes */5000`.

**Follow-up:**

Why do video players depend on this?

Answer: Seeking and buffering use byte-range requests; without 206 support, the player must download from the start.

### NODE-244 — Serving ranges with streams and If-Range

**Difficulty:** Senior

**Category:** Range requests

**Question:**

How do you serve a range with streams, and what is `If-Range`?

**Answer:**

Parse the header (validate `start <= end < size`, handle suffix ranges `-500` and open-ended `500-`), then `fs.createReadStream(path, { start, end })` piped to `res` via `pipeline`. `If-Range` carries an ETag/date; if it no longer matches the file, ignore the range and send the full 200 response to avoid corrupted resumed downloads.

**Follow-up:**

Multiple ranges?

Answer: They require `multipart/byteranges` responses. Most servers simply serve the full content or the first range; attackers can abuse many overlapping ranges for DoS, so cap them.

### NODE-245 — Security headers at the HTTP layer

**Difficulty:** Intermediate

**Category:** Security headers

**Question:**

Which security headers should an HTTP response set, and what does each do?

**Answer:**

`Strict-Transport-Security` (force HTTPS; only on HTTPS), `X-Content-Type-Options: nosniff`, `Content-Security-Policy` (restrict script/style/frame sources; `frame-ancestors` replaces `X-Frame-Options`), `Referrer-Policy`, `Permissions-Policy`, and cross-origin policies (`COOP`, `CORP`). Remove fingerprinting like `X-Powered-By`.

**Follow-up:**

Where do you set them, app or proxy?

Answer: Prefer one consistent place — a proxy/CDN for static policy, or middleware like Helmet in app. Avoid duplicates, and test CSP in report-only mode first.

### NODE-246 — ETag, Last-Modified, and 304

**Difficulty:** Intermediate

**Category:** Caching

**Question:**

How do `ETag`, `Last-Modified`, and `304 Not Modified` work in Node?

**Answer:**

The server sends `ETag` and/or `Last-Modified`; clients revalidate with `If-None-Match`/`If-Modified-Since`. If unchanged, respond `304` with no body (Node strips bodies for 304/204/HEAD). Combine with `Cache-Control` (`max-age`, `immutable`, `no-store`) for correct caching.

**Follow-up:**

`no-cache` vs `no-store`?

Answer: `no-cache` allows storing but requires revalidation each time; `no-store` forbids storing at all. Use `no-store` for sensitive responses.

### NODE-247 — HEAD and bodiless statuses

**Difficulty:** Junior

**Category:** Semantics

**Question:**

How does Node treat `HEAD` and bodiless statuses?

**Answer:**

For `HEAD`, Node sends headers but discards any body you write, though you can still set `Content-Length`. 204, 205, and 304 responses also have no body, and writing one is ignored or errors. Handlers should still compute the same headers as `GET` for HEAD.

**Follow-up:**

Common bug?

Answer: Returning `204` with a JSON body or setting a wrong `Content-Length` leads to clients hanging or parse errors. Send nothing for 204.

### NODE-248 — clientError and malformed requests

**Difficulty:** Intermediate

**Category:** Errors

**Question:**

How do you handle malformed requests and `'clientError'`?

**Answer:**

Parser errors (bad syntax, oversize headers) emit `'clientError'` on the server with `(err, socket)`. The default behavior responds `400 Bad Request` and destroys the socket. If you add a listener you must write a response yourself and end/destroy the socket, or it leaks.

**Follow-up:**

What about errors on `req` itself?

Answer: `req` can emit `'error'` (e.g. aborted connection, `ECONNRESET`). Without a listener it throws as uncaught. Use `pipeline` or add handlers.

### NODE-249 — maxHeaderSize and 431

**Difficulty:** Intermediate

**Category:** Limits

**Question:**

What is `maxHeaderSize` and what happens when it's exceeded?

**Answer:**

Default max total header size is 16 KiB (`--max-http-header-size` or `maxHeaderSize` server option). Larger headers are rejected with `431 Request Header Fields Too Large` (or the connection is closed). Oversized cookies are a frequent cause in practice.

**Follow-up:**

Should you just raise it?

Answer: Prefer to reduce cookie/header size. Raising it increases memory per connection and the attack surface; proxies often have their own lower limits anyway.

### NODE-250 — Defending against slow and abusive clients

**Difficulty:** Senior

**Category:** Hardening

**Question:**

How do you defend a bare Node HTTP server against slow or abusive clients?

**Answer:**

Combine `headersTimeout`, `requestTimeout`, `keepAliveTimeout`, `server.maxConnections`, `maxRequestsPerSocket` (rotate connections), body limits, and a front proxy/WAF with rate limiting. Handle backpressure and cancel work on `close`. Keep Node updated for parser and HTTP/2 CVE fixes.

**Follow-up:**

What does `maxRequestsPerSocket` do?

Answer: After N requests on one keep-alive connection, Node sends `Connection: close`, forcing clients to reconnect. It helps rebalance load and bound per-connection state; default `0` means unlimited.
