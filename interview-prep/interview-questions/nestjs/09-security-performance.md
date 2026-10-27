# NEST09 — Security and performance

NestJS 10, Express adapter unless noted. Questions NEST-401–NEST-450.

Helmet and Content-Security-Policy, CORS beyond the cookie case, CSRF middleware, throttling, validation as a security boundary, ORM injection, SSRF, uploads, secrets, interceptor and serialization cost, N+1 in services, cache-manager, compression, keep-alive, profiling, shutdown, body limits, expensive routes, and horizontal scale. Passport, JWT, sessions, and login brute-force stay in NEST04.

### NEST-401 — Where Helmet belongs

**Difficulty:** Junior

**Category:** HTTP headers

**Question:**

Where do you attach Helmet in a NestJS 10 app, and why is a controller guard the wrong place?

**Answer:**

Helmet sets safer default HTTP response headers. Attach it once in `main.ts` with `app.use(helmet())` before `listen`, so every response that leaves the process gets those headers, including 404s and routes that never reach a controller. A guard runs later and only on routes Nest maps, so health checks and unknown paths would skip it. Register Helmet before other middleware starts writing the body, while headers can still be changed.

**Follow-up:**

Does Helmet stop SQL injection or a stolen token?

Answer: No. It only adds response headers, so validation, parameterized queries, authentication, and rate limits stay separate. Treat Helmet as the header baseline, then close the other holes in the request pipeline.

### NEST-402 — What Helmet turns on

**Difficulty:** Intermediate

**Category:** HTTP headers

**Question:**

Which risks do Helmet’s default headers reduce on a Nest API, and which header do teams trip over first?

**Answer:**

With Helmet 7, the usual pairing for a current Nest 10 app, `app.use(helmet())` sends a bundle of headers. `X-Content-Type-Options: nosniff` stops browsers from treating a response as HTML or a script. Frame protections make clickjacking harder. `Referrer-Policy` limits leakage of tokens that were put in a query string. `Strict-Transport-Security` keeps the browser on HTTPS. Content-Security-Policy is on by default, and that is the header that breaks first when a page needs inline scripts.

**Follow-up:**

Should you disable Helmet in development because Swagger looks blank?

Answer: Keep Helmet on in every environment. Relax CSP for the docs path only. A development-only setup hides the breakage until production.

### NEST-403 — CSP when Nest also serves HTML

**Difficulty:** Intermediate

**Category:** HTTP headers

**Question:**

How do you configure Helmet’s Content-Security-Policy when one Nest process serves JSON and a small HTML page?

**Answer:**

CSP tells the browser which sources may supply scripts, styles, images, and connections. A JSON-only API can use a tight policy because no page runs scripts. As soon as you serve Swagger, a status page, or a view, the policy has to match that HTML. Prefer a host allowlist and `'self'` over `'unsafe-inline'`. If the docs page needs a looser policy, mount that Helmet config on the docs path only and keep the API responses strict. A tutorial that sets `unsafe-inline` and `unsafe-eval` on the whole app weakens every route.

**Follow-up:**

When is “CSP is useless on a JSON API” actually wrong?

Answer: It is wrong as soon as any route can return HTML, an error page, Swagger, or an uploaded file. One `text/html` response on your origin is enough for a script to run, and CSP is the backstop.

### NEST-404 — CORS options that change the browser

**Difficulty:** Intermediate

**Category:** CORS

**Question:**

Which `enableCors` options decide whether a browser will send a cross-origin Nest request and be allowed to read the response?

**Answer:**

Call `app.enableCors` in `main.ts`. `origin` is the list of pages that may read the response. `methods` and `allowedHeaders` must include every verb and every non-simple header the client sends, or the preflight fails before your controller runs. `maxAge` tells the browser how long it may cache that preflight, which removes an extra round trip on later POST and PUT calls. Set these in one place. A header you add by hand on the happy path is often missing when Nest returns an error.

**Follow-up:**

Do a native mobile app and a server-side worker need this CORS config?

Answer: No. Clients that are not browsers ignore CORS and send the request either way. An origin allowlist protects pages, and the route still needs its own authentication.

### NEST-405 — Reflecting the request origin

**Difficulty:** Senior

**Category:** CORS

**Question:**

What goes wrong when `enableCors` uses `origin: true`, or a function that echoes the request `Origin`, together with `credentials: true`?

**Answer:**

`origin: true` copies the browser’s `Origin` into `Access-Control-Allow-Origin` and still allows credentials. Any website can then make a credentialed call and read the body, as long as the user has a cookie for your API. That removes the allowlist. An origin callback should accept only origins you configured. Matching with `endsWith('example.com')` is a common miss, because `https://evil-example.com` passes. A missing `Origin` is normal for some non-browser clients. A real cross-site browser request always sends one.

**Follow-up:**

What does the browser do if you send `Access-Control-Allow-Origin: *` and allow credentials?

Answer: It rejects the response. The spec forbids `*` on a credentialed request, so the page cannot read the body. Echoing a concrete attacker origin is the combination that actually works.

### NEST-406 — Where a CSRF check runs

**Difficulty:** Senior

**Category:** CSRF

**Question:**

Cookie sessions already use `SameSite`. Where do you put a CSRF check in Nest, and which routes should skip it?

**Answer:**

Nest has no built-in CSRF module. Add a small middleware in `main.ts`, early, so it rejects a bad request before guards and controllers do work. Check unsafe methods only: POST, PUT, PATCH, and DELETE. Compare the token with `crypto.timingSafeEqual` on equal-length buffers. Skip the check for routes that never rely on a browser cookie, such as a webhook that proves itself with a signature. Skipping `GET` is normal. Skipping every request that has an `Authorization` header is safe only when that header is the only credential.

**Follow-up:**

Why must the webhook skip be tied to the signature check?

Answer: An attacker can call the same path from a browser and attach the victim’s cookie. If that route changes state and skips CSRF without verifying a signature, the cookie alone is enough.

### NEST-407 — Double-submit tokens without `csurf`

**Difficulty:** Senior

**Category:** CSRF

**Question:**

`csurf` is deprecated. How do you do a double-submit CSRF token for a NestJS 10 cookie app?

**Answer:**

On login, or on a small `GET /csrf` route, set a cookie to `crypto.randomBytes(32)` encoded as hex or base64. Leave it readable by your frontend script, so do not mark that cookie `httpOnly`. Use `Secure` in production and `SameSite=Lax` or `Strict`. The browser app copies the value into `X-CSRF-Token`. Middleware accepts the unsafe method only when the header and the cookie match. A synchronizer token stored in the server session is stronger when a sibling subdomain might be able to read `document.cookie`, because that token never lives where script on the other host can see it.

**Follow-up:**

Why is the custom header only half of the defense?

Answer: A plain HTML form can send cookies, but it cannot set `X-CSRF-Token`, so the browser forces a preflight. If CORS reflects any origin and allows that header, the attacker’s script can set it. The token comparison is the real check.

### NEST-408 — Same-site is not same-origin

**Difficulty:** Intermediate

**Category:** CSRF

**Question:**

The SPA is on `app.example.com` and the Nest API is on `api.example.com`. How do `SameSite` and CORS treat that pair?

**Answer:**

Both hosts share the registrable domain `example.com`, so they are same-site. A `SameSite=Lax` cookie is sent on XHR from the SPA to the API. A page on `evil.com` is cross-site, and the browser withholds that cookie on a cross-site POST. CORS still treats `app` and `api` as different origins, so the SPA cannot read the response until `enableCors` lists `https://app.example.com`. You want both: cookie flags so other sites do not ride the session, and a CORS allowlist so only your page can read credentialed responses.

**Follow-up:**

Does `SameSite=Lax` stop a malicious script served from `blog.example.com`?

Answer: No. That host is same-site, so the browser still attaches a `Lax` cookie. A CSRF token that is not readable by that subdomain, or a cookie `Domain` scoped only to the API host, is what closes the gap.

### NEST-409 — ThrottlerModule on Nest 10

**Difficulty:** Intermediate

**Category:** Rate limiting

**Question:**

How do you turn on `@nestjs/throttler` v5 for Nest 10, and what do `ttl` and `limit` mean?

**Answer:**

Throttler counts requests per tracker inside a time window. On v5, which is the line you pair with Nest 10, `ttl` is milliseconds. `ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }])` allows 100 requests per tracker per minute. Register `ThrottlerGuard` as an `APP_GUARD` so it applies everywhere. When the counter passes the limit, Nest responds with `429` and `Retry-After`. The default storage is memory inside that process. That is correct for one Node process and wrong once you run more than one instance.

**Follow-up:**

You set `ttl: 60` from an older example. What happens on v5?

Answer: The window is 60 milliseconds, not 60 seconds. Real clients trip `429`, or the bucket resets so fast that it barely protects you. Write `60000` for one minute and test `limit + 1` calls.

### NEST-410 — `@Throttle` and `@SkipThrottle`

**Difficulty:** Intermediate

**Category:** Rate limiting

**Question:**

How do you override the global throttler on one route, and which routes should skip it?

**Answer:**

`@Throttle({ default: { limit: 5, ttl: 60000 } })` replaces the numbers for that controller or handler. `@SkipThrottle()` turns the guard off. Use a tight limit on routes that are expensive or easy to guess against: login, password reset, token refresh, and report generation. Skip only probes that do almost no work, such as a load-balancer health check. If you defined several named throttlers, `@Throttle` must name the one it changes. A class-level `@SkipThrottle()` on an admin controller quietly opens every method on that class.

**Follow-up:**

A global guard and a method decorator both set limits. Which one wins?

Answer: Method metadata wins for the throttler names it sets. Names it does not mention still use the global limit. `@SkipThrottle()` on the method disables throttling for that route even when the guard is global.

### NEST-411 — Throttling behind a proxy

**Difficulty:** Senior

**Category:** Rate limiting

**Question:**

After you put Nest behind a load balancer, every client shares one rate-limit bucket. Why, and how do you fix it?

**Answer:**

Express sets `req.ip` from the TCP peer. Behind a proxy, that peer is the proxy, so every user shares one key. Trust only the hop you operate, with `app.set('trust proxy', 1)` for a single proxy. Then `req.ip` is the client address that proxy appended, and a custom `getTracker` can return it. On Fastify, set `trustProxy` in the adapter options instead. `trust proxy` set to `true` on a service that is reachable from the internet lets clients spoof `X-Forwarded-For` and pick a fresh bucket on every request.

**Follow-up:**

The client IP is the second address because a CDN sits in front of your proxy. What should you trust?

Answer: Count the hops you run, or ignore `X-Forwarded-For` and read a single header your edge sets, such as `X-Real-IP`. The left-most forwarded value is client-supplied if the request can reach Node without passing through that edge.

### NEST-412 — Key the bucket by user

**Difficulty:** Intermediate

**Category:** Rate limiting

**Question:**

Why is an IP throttle a weak limit on an authenticated Nest API, and how do you key the bucket by user?

**Answer:**

Many real users share one NAT address, so an IP limit punishes the whole office. A stolen token used from many addresses never trips an IP limit. After authentication, the stable key is the user id. Subclass `ThrottlerGuard` and return `user:${req.user.id}` from `getTracker` when `req.user` exists, and `req.ip` otherwise. The throttler has to run after the guard that sets `req.user`, because `getTracker` only sees what earlier guards already attached. Keep a separate IP limit on routes that are still anonymous, and never key a public route by an email taken from the body.

**Follow-up:**

`ThrottlerGuard` is registered before `JwtAuthGuard`. Why is `req.user` empty inside `getTracker`?

Answer: Global guards run in registration order, and `getTracker` runs inside the throttler. The JWT guard has not set `req.user` yet. Register authentication first, or the user bucket never applies.

### NEST-413 — One limit across many pods

**Difficulty:** Senior

**Category:** Rate limiting

**Question:**

Four Nest pods use the default Throttler storage. The limit is 100 per minute. Why does a client get far more than that through, and what storage fixes it?

**Answer:**

The default storage is a `Map` in the process. Each pod counts to 100 on its own, so four pods allow about 400 requests as the load balancer spreads them. Implement `ThrottlerStorage` with Redis and pass it to `forRoot`. `increment` has to be atomic: one key, one increment, one TTL, one round trip. A GET followed by a SET lets two pods both read 99 and both allow the request. Decide what happens when Redis is down. Failing open on a password route drops the control you added it for.

**Follow-up:**

Is an application lock around the guard required if Redis `INCR` is atomic?

Answer: No. One Lua script or a transaction that increments and sets the expiry is enough. You do need the TTL to match the window you designed, and you should test two processes against one Redis before trusting the limit.

### NEST-414 — ValidationPipe as a security boundary

**Difficulty:** Intermediate

**Category:** Validation

**Question:**

How does a global `ValidationPipe` reduce attacks, and what does it refuse to decide?

**Answer:**

The pipe runs class-validator on the DTO before your method body. Wrong types, missing fields, and unknown fields never reach the service when you turn on `whitelist` and `forbidNonWhitelisted`. That cuts mass assignment and a lot of “this string is actually an object” bugs. It does not decide that this user may update that row, and it does not make a raw SQL string safe. A field you declare, such as `@IsBoolean() isAdmin`, is accepted from anyone who can call the route. Leave privileged fields off the public DTO and set them on the server.

**Follow-up:**

The pipe is registered on one controller only. What is the practical result?

Answer: Every other controller still accepts raw objects, and new routes usually forget the decorator. A global pipe in `main.ts` or `APP_PIPE` makes the strict behavior the default. Loosen a single webhook with a local pipe if you must.

### NEST-415 — Whitelist and mass assignment

**Difficulty:** Intermediate

**Category:** Validation

**Question:**

A PATCH handler does `repo.save({ ...user, ...body })`. How does a client become an admin, and how do `whitelist` and `forbidNonWhitelisted` stop it?

**Answer:**

The JSON body is chosen by the client. If the entity has `isAdmin`, `role`, or `companyId`, those keys are written when you spread `body` into `save`. `whitelist: true` strips properties that have no decorator on the DTO. `forbidNonWhitelisted: true` returns 400 instead, so the attempt shows up in logs. The DTO should list only fields this client may change, such as `name`. Map those fields by name in the service. Do not use the entity as the `@Body()` type, because it carries every column. Whitelist is the safety net behind that explicit mapping.

**Follow-up:**

Whitelist is on, but the handler is `@Body() body: any`. What happens?

Answer: The pipe has no class to read decorators from, so nothing is stripped. Interfaces disappear at runtime too. The parameter type has to be a class, and `emitDecoratorMetadata` has to be enabled.

### NEST-416 — Nested objects bypass a shallow whitelist

**Difficulty:** Senior

**Category:** Validation

**Question:**

The DTO has `@IsObject() address`. A client sends `address.userId` and `address.isDefault`. Why did whitelist miss them?

**Answer:**

`@IsObject()` only checks that the value is an object. It does not build a nested DTO, so there are no inner decorators for whitelist to apply. The nested keys reach a relation save unchanged. Use `@ValidateNested()`, and `@Type(() => AddressDto)` so class-transformer builds the right class. Put `@IsString()` and the other checks on `AddressDto` itself. For arrays, add `{ each: true }` on `@ValidateNested()` and point `@Type` at the item class. Using the TypeORM entity as that nested class brings the same mass-assignment problem one level down.

**Follow-up:**

The nested DTO is whitelisted, and it still has an `id` field. Is the write safe?

Answer: Whitelist only drops keys you did not declare. `id` is intentional input if it is on the DTO. Omit identity and status fields from the input class and set them in the service.

### NEST-417 — Implicit conversion

**Difficulty:** Intermediate

**Category:** Validation

**Question:**

`transform: true` is useful. What security bugs does `enableImplicitConversion` add?

**Answer:**

`transform: true` runs class-transformer so the body becomes a DTO instance, and an explicit `@Type(() => Number)` can turn a query string into a number. That path is predictable. `enableImplicitConversion: true` converts using the TypeScript design type. Query values arrive as strings, so a flag such as `admin=false` can become boolean `true` because the string is non-empty, and repeated keys can become arrays. Prefer `@Type` on the few fields that need it, and reject objects where you expect a string with `@IsString()`. Take roles from the authenticated user record, not from a coerced query flag.

**Follow-up:**

How should a real boolean query flag be parsed?

Answer: Accept only the strings `'true'` and `'false'` in an explicit `@Transform`, and fail validation for every other value. Add a test that sends `flag=false`, `flag=0`, and `flag[]=true`.

### NEST-418 — Sort and include skip the body whitelist

**Difficulty:** Intermediate

**Category:** Validation

**Question:**

Body DTOs are whitelisted, but `sort` and `include` are raw `@Query()` strings passed into a query builder. What is the exposure?

**Answer:**

The body pipe does not validate other parameters unless they are DTO classes too. A raw `@Query('sort') sort: string` is only a string. Passing it to `.orderBy(sort)` or building a select list from `fields` lets the client choose SQL fragments. Validate with a DTO: `@IsIn(['name', 'createdAt'])` for the sort key and `@IsIn(['asc', 'desc'])` for the direction. Map that literal to a column in code so the builder never receives an identifier straight from the client. Apply the same allowlist to `include`, or one request can join half the schema.

**Follow-up:**

`@IsIn` is on the DTO, but the service reads `req.query.sort`. Are you covered?

Answer: No. The pipe validates the controller argument, while the raw request still holds the original string, including duplicates. Use the DTO argument only.

### NEST-419 — SQL built with string concatenation

**Difficulty:** Intermediate

**Category:** Injection

**Question:**

TypeORM is an ORM, so a Nest service is “safe from SQL injection.” Where is the hole, and what is the safe call?

**Answer:**

The ORM binds values when you use its object API or named parameters. It does not inspect a SQL string you concatenated. `` repo.query(`SELECT * FROM "user" WHERE email = '${email}'`) `` changes meaning when `email` contains a quote and `OR 1=1`. The safe form is `repo.query('SELECT * FROM "user" WHERE email = $1', [email])`. In a query builder, `where('user.email = :email', { email })` binds the value. `` where(`user.email = '${email}'`) `` does not. Search boxes and admin report filters are the usual places this shows up. A validation pipe does not parse SQL.

**Follow-up:**

The value is bound, and a 10,000-character email still spikes the database. Is that injection?

Answer: No. The driver sent it as data, so the statement shape did not change. Cap the field with `@MaxLength` and set a statement timeout so one legal query cannot dominate the database.

### NEST-420 — ORDER BY and LIKE are not values

**Difficulty:** Senior

**Category:** Injection

**Question:**

`WHERE` values are parameters, but `.orderBy(query.sort)` and a `LIKE '%${q}%'` remain. What can a client still do?

**Answer:**

Bound parameters are for values, not for column names or SQL keywords. `.orderBy(query.sort)` inserts an identifier into the statement, which can add extra SQL or sort by a field the client should not see. Map each allowlisted literal to a fixed column in code. `LIKE` is injection-safe when the whole pattern is one bound parameter, and unsafe when you interpolate it. User-supplied `%` is also a full scan. Escape `%` and `_` in the user text, then add your own wildcards and bind the result.

**Follow-up:**

Does moving from TypeORM to Prisma remove this?

Answer: Prisma’s object API does not concatenate SQL, so the common case is safer. `$queryRawUnsafe` and `Prisma.raw(userInput)` open the same hole. Identifiers still have to come from a map in your code.

### NEST-421 — A request object as `where`

**Difficulty:** Senior

**Category:** Injection

**Question:**

A service calls `users.find({ where: req.query })` so filters stay “dynamic.” What can the client change?

**Answer:**

`req.query` is untrusted. On Express it can include nested objects and repeated keys. Passing it through as `where` lets the client filter on any column the entity exposes, including `isAdmin` or another person’s email. That is mass assignment on the read path. With the MongoDB driver, operator objects in that blob are a known injection style. Set tenant and owner columns yourself from the authenticated user. Accept only enumerated filters from a DTO. Never pass `req.query`, `req.body`, or a generic record into `where`.

**Follow-up:**

The route is admin-only, so a raw `where` JSON blob is allowed. Is that fine?

Answer: No. Admin accounts get phished, and the blob can filter relations the UI never offered, including other tenants when “admin” is only a role flag. Give admins explicit filter fields.

### NEST-422 — Prisma `$queryRaw` and `$queryRawUnsafe`

**Difficulty:** Intermediate

**Category:** Injection

**Question:**

A Nest Prisma service drops to raw SQL for a report. Which API keeps the email as data?

**Answer:**

Use the tagged template. `` prisma.$queryRaw`SELECT id, email FROM "User" WHERE email = ${email}` `` sends `email` as a parameter. `$queryRawUnsafe` with a concatenated string treats the input as SQL text. So does `Prisma.raw` when the fragment already contains user text. Keep raw SQL in one repository method so review can find `$queryRawUnsafe` and `Prisma.raw`. Stay on `findMany` until you have a measured reason to drop down. A report that must be raw should still take an allowlisted group-by column and bound dates.

**Follow-up:**

The email is a JavaScript string inside the tagged template. Can a quote break out of it?

Answer: No. The tag does not build a quoted literal. Prisma sends the string as a parameter, and a quote stays inside that value unless you concatenate first and pass one big string in.

### NEST-423 — SSRF from `HttpService`

**Difficulty:** Senior

**Category:** SSRF

**Question:**

A Nest service takes a URL from the client and passes it to `HttpService` or `fetch` for a link preview or a webhook. What is the attack?

**Answer:**

Server-side request forgery means the client picks the URL and your process performs the request. The server can reach addresses the attacker cannot: loopback, the cloud metadata address `169.254.169.254`, and private services on the VPC. `HttpModule` does not block any of that. It is only an HTTP client. Webhook delivery, avatar fetch, PDF renderers, and “import from URL” are the features that grow this bug. The impact is use of your network position and, on many clouds, theft of credentials from the metadata service.

**Follow-up:**

The route requires a logged-in user. Does that close SSRF?

Answer: No. Authentication decides who may call you, and SSRF decides who your process may call. A normal user must not aim the server at the metadata service, and the route still needs a rate limit so an allowlisted host cannot be hammered.

### NEST-424 — Redirects to the metadata address

**Difficulty:** Senior

**Category:** SSRF

**Question:**

You reject `localhost` and `169.254.169.254`, then call axios. The client sends `https://evil.example/redirect`. Why does the metadata service still get a request?

**Answer:**

Axios follows redirects by default. Your check sees the first URL, a public host. The response is a 302 whose `Location` is the metadata address, and the client library fetches it from inside the VPC. The same idea works with odd spellings of loopback, IPv6-mapped addresses, and a decimal IP. Check scheme and host with `new URL`, allow `https` only, and set `maxRedirects: 0` unless you re-check every hop. String-matching a few banned names misses the rest of the private network: `10/8`, `172.16/12`, `192.168/16`, link-local, and IPv6 unique-local.

**Follow-up:**

Redirects are off, and the blocklist has localhost and the metadata IP. Is that enough?

Answer: No. Attackers use other private addresses, IPv6, and your real internal hostnames. Prefer an allowlist of partner hosts, and if users may submit arbitrary URLs, reject a resolved private IP on every request.

### NEST-425 — DNS rebinding

**Difficulty:** Staff

**Category:** SSRF

**Question:**

You resolve the hostname, reject private IPs, then pass the original hostname to `HttpService`. How does DNS rebinding still win?

**Answer:**

DNS can answer with a public IP on the first lookup and a private IP on the second. You approve the first answer, then the HTTP client looks the name up again and connects to loopback or the metadata address. The fetch has to connect to the IP you already approved. Keep the hostname as the `Host` header and as the TLS server name so the certificate still matches. If the library cannot pin that address, it is the wrong client for user-supplied URLs. Hosts you configured in `ConfigService` do not need this dance. User-supplied hosts do.

**Follow-up:**

Tenants store webhook hosts in the database. What do you check at delivery time?

Answer: Block bare IPs, credentials in the URL, and ports other than 443. Run the SSRF checks again on delivery, because DNS changes after the row is saved. Log the resolved IP so an incident has evidence.

### NEST-426 — Upload size limits

**Difficulty:** Intermediate

**Category:** Uploads

**Question:**

How do you cap upload size in a NestJS 10 app that uses `FileInterceptor` on the Express adapter?

**Answer:**

Multer buffers the part unless you cap it. Set `limits` on the interceptor: `fileSize` in bytes, plus `files` and `fields`. A 2 MB avatar route rejects a larger part instead of writing the rest to disk. `MaxFileSizeValidator` in `ParseFilePipe` makes the error message consistent, but the interceptor limit is what stops the stream. Those limits do not apply to `application/json`. On Fastify, the Express file interceptors do not run. Configure `@fastify/multipart` `limits.fileSize` instead. A proxy body cap in front of Node means the process is not the first place to hold the bytes.

**Follow-up:**

Each file is capped at 2 MB. How does the disk or the memory still fill up?

Answer: Many requests, or a second route that forgot the interceptor, still add up, and memory storage holds each file in RAM. Add a rate limit, a per-user quota, and a disk alert. A high `fileSize` is also a memory cap because the default storage keeps the file in the process.

### NEST-427 — MIME type is not file type

**Difficulty:** Intermediate

**Category:** Uploads

**Question:**

`FileTypeValidator` checks the MIME type. How can a client still store HTML or SVG that runs as script?

**Answer:**

The client supplies `Content-Type` and the filename. A check that trusts `file.mimetype` trusts the attacker. They can upload HTML or an SVG with a script under a `.jpg` name. If you later serve that object from the API origin, the browser may run it as your site. Check magic bytes, allow only types you re-encode, such as JPEG, PNG, and WEBP, and reject SVG and HTML unless you have a real sanitizer and a separate host. When you serve the file, choose the `Content-Type` yourself, set `Content-Disposition: attachment`, and keep `nosniff`. Serving uploads from another host limits a missed check.

**Follow-up:**

You re-encode every image with `sharp` before saving. What attack remains?

Answer: Re-encoding drops odd chunks and polyglot payloads because the bytes on disk are a new image. A small file can still expand into a huge bitmap. Cap bytes and pixel dimensions, and limit how many decodes run at once.

### NEST-428 — `originalname` and path traversal

**Difficulty:** Intermediate

**Category:** Uploads

**Question:**

The handler saves to `./uploads/${file.originalname}`. What is the exploit, and what name should you store?

**Answer:**

`originalname` comes from the client. A value such as `../../.env` can leave the upload directory if you join paths and the process can write there, and a repeated name overwrites someone else’s file. Ignore the client name for the storage key. Use a `randomUUID` plus an extension taken from the detected type, then reject the resolved path if it is no longer inside the upload directory. Keep the original name only as a display label. Store files outside any folder Nest serves, or in object storage behind a short-lived signed URL.

**Follow-up:**

Is `path.join` plus `startsWith(dir)` enough?

Answer: Only after both sides are `path.resolve`d, and it is still easy to get wrong on Windows. The stronger design never puts `originalname` in the path. Keep the prefix check on the generated key so a later change cannot escape.

### NEST-429 — Fail closed on missing secrets

**Difficulty:** Intermediate

**Category:** Configuration

**Question:**

How should a NestJS 10 app load secrets so a missing or weak value stops boot instead of using a default?

**Answer:**

Use `ConfigModule.forRoot` with a Joi or Zod `validationSchema`. Require `DATABASE_URL`, signing secrets, and similar values, and set a minimum length on secrets. The process should exit before it accepts traffic if a key is absent. Do not default a production secret to `changeme`. Read values through `ConfigService` so there is one path for a missing key. `cache: true` avoids reading the environment on every `get`. The cache is a speed detail. The secret still lives in process memory, and a rotation still needs a restart.

**Follow-up:**

A schema uses `.default('dev-secret')` so local boot is easy. What fails in production?

Answer: If the platform forgets the variable, validation still passes and every environment shares a secret that is in the source tree. Anyone can forge tokens. Require the variable with no default, and keep a gitignored `.env` for local development only.

### NEST-430 — How Nest apps leak secrets

**Difficulty:** Intermediate

**Category:** Configuration

**Question:**

The schema is strict. How do secrets still leak from a Nest deploy, and which config flag helps?

**Answer:**

Typical leaks are a `.env` copied into the image, a bootstrap log that prints `process.env`, a driver error that embeds the database URL, real passwords in `docker-compose.yml`, and a health route that returns config. A frontend build that imported the server config file leaks the same values to the browser. In production set `ignoreEnvFile: true` so the process uses the environment the platform injected, not a file baked into the image. Ignore `.env` in Docker and git. Log key names when validation fails, never the values. With `cache: true`, a changed file is invisible until the process restarts anyway.

**Follow-up:**

The global exception filter logs a Postgres error whose message contains the connection string. What do you change?

Answer: Return a generic 500 to the client and log a redacted message plus a correlation id. Add a test whose error text includes a URL password and assert the sink does not contain it. Rotate the password if a log pipeline may already have stored it.

### NEST-431 — CSP on a JSON-only API

**Difficulty:** Junior

**Category:** HTTP headers

**Question:**

You turned CSP off because the Nest app “only returns JSON” and the header broke the docs. What should you turn back on?

**Answer:**

Turn CSP back on for the process. A policy with `default-src 'none'` and `frame-ancestors 'none'` fits a response that should never execute a script. Browsers still apply it if a bug, a wrong `Content-Type`, or an uploaded file makes them parse HTML. Nest’s own 404 should stay JSON, not an HTML page with inline scripts. If you use Swagger, give `/docs` a separate looser policy and do not leave the docs open in production. The header is cheap. The outage people fear is almost always the docs page, and that page can be scoped.

**Follow-up:**

Every handler sets `application/json`. Why keep `script-src` anyway?

Answer: One `res.type('html')`, one exception filter that renders a view, or one uploaded file is enough to make the browser parse HTML. A strict script policy then blocks the script. Scope the looser policy to the docs route instead of removing CSP everywhere.

### NEST-432 — Nonces for inline scripts

**Difficulty:** Senior

**Category:** HTTP headers

**Question:**

A Nest view or server-rendered page needs one inline script. How do you allow it without `'unsafe-inline'`?

**Answer:**

A nonce is a random value used once. Generate it per request with `crypto.randomBytes`, store it on `res.locals`, and send the same value in `script-src`. The template puts that nonce on the script tag, and the browser runs only a script that carries it. Do not reuse one nonce for the life of the process, and do not echo it in a JSON field. A static script can use a hash instead. Moving the script to a file served from `'self'` is simpler. A CDN must not cache HTML under a policy whose nonce will not match the next response.

**Follow-up:**

The nonce is created once at boot and stored on the app. What fails?

Answer: Every response shares it until restart. Anyone who sees the HTML, a cache, or a log can inject a script with that same nonce. Generate it inside request middleware and attach it only to that response.

### NEST-433 — What a global interceptor costs

**Difficulty:** Intermediate

**Category:** Performance

**Question:**

The Nest app feels slower after one more global interceptor. Where does the time go?

**Answer:**

Nest wraps the route handler in every interceptor on that route. Each one usually waits on `next.handle()`. Work you `await` before calling `next` is added latency on every request, including health checks when the interceptor is global. The expensive habits are a database log before `next`, cloning `req.body`, and running `JSON.stringify` or `instanceToPlain` on the response. An interceptor that only sets a header is cheap. Scope heavy interceptors with `@UseInterceptors` on the controllers that need them. Compare one route with autocannon before and after the interceptor, instead of guessing from the source.

**Follow-up:**

The interceptor calls `next.handle()` first and logs in `tap`. Does the client still wait?

Answer: The handler itself is not delayed by work that happens after it finishes. A `tap` that stringifies a large body still occupies the event loop, so other requests stall even if this response was already produced. Log a duration and a route template, and sample it.

### NEST-434 — Interceptors that stringify the body

**Difficulty:** Senior

**Category:** Performance

**Question:**

A logging interceptor maps the response through `JSON.stringify`. Why do list routes stall the process?

**Answer:**

`JSON.stringify` on a large DTO is synchronous. While it runs, that Node process does not accept new connections or progress other requests. The interceptor also needs the whole result as one object, so you cannot stream it. If `ClassSerializerInterceptor` already walked the same graph, you pay twice. Log status, duration, route template, and user id, and leave the body off the hot path. Gate a full dump behind a flag and a size cap. A global `map` that clones arrays also adds garbage collection on list routes.

**Follow-up:**

The same interceptor wraps an SSE or file stream. What breaks besides CPU?

Answer: `map` and `JSON.stringify` expect one value. A stream emits many chunks or never completes, so buffering holds the connection and can exhaust memory. Skip the interceptor on those handlers, and do not run `ClassSerializerInterceptor` on a `StreamableFile`.

### NEST-435 — `ClassSerializerInterceptor` cost and leaks

**Difficulty:** Intermediate

**Category:** Serialization

**Question:**

What does `ClassSerializerInterceptor` do on the way out, and how do you strip `passwordHash` without serializing twice?

**Answer:**

The interceptor runs class-transformer `instanceToPlain` on the value you return. `@Exclude()` drops fields such as `passwordHash`, and `@Expose()` can limit a class to the public view. That protects the response and leaves inbound mass assignment to the validation pipe. A page of users with nested relations allocates a second tree. On a hot route, shape a plain DTO in the service and skip the interceptor. Use it when the object is small and you want a guaranteed strip. Decorators apply only to class instances, so a raw query row still includes every column.

**Follow-up:**

The handler returns `repo.query()` rows and the hash still appears. Why?

Answer: class-transformer only honors decorators on class instances. Map the rows into the entity with `plainToInstance`, or select the columns in SQL so the hash never enters Node. Selecting fewer columns is also faster.

### NEST-436 — Serialization that fires queries

**Difficulty:** Senior

**Category:** Serialization

**Question:**

A list route is fast inside the service and slow once `ClassSerializerInterceptor` runs. The entity uses lazy relations. What is happening?

**Answer:**

TypeORM lazy relations load when something touches the property. class-transformer, `JSON.stringify`, or a logger can touch it while building the response. You asked for 50 orders and then loaded a customer and a payment per row after the service returned. The service timing looked fine because the extra queries happen later. Load the relations you need in the original `find` or query builder, and return a DTO. Leave lazy relations off entities you send from HTTP handlers. If a worker still needs them, map to a response object before the interceptor can see the live entity.

**Follow-up:**

You added every relation on the list query to “remove N+1.” What new cost shows up?

Answer: The row set can explode into orders times payments times line items, and Nest then serializes that product. Select the columns the page needs, paginate, and keep the heavy graph on a detail route.

### NEST-437 — N+1 that lives in the service

**Difficulty:** Intermediate

**Category:** Data access

**Question:**

The repository uses one `find`. The Nest service is still N+1. How does that happen, and how do you see it?

**Answer:**

N+1 means one query for the list and another query per row, from any code in the loop. A service that loads 50 orders and then `await`s `pricing.quote(order.id)` or `users.findOne(order.userId)` for each row does this, even when the first `find` was perfect. The calls often run in series, so latency stacks. Turn on SQL logging in development and count statements for one HTTP call. The same `SELECT` repeated with different ids is the bug. Raising the pool size hides it until production concurrency runs out of connections.

**Follow-up:**

You wrap the loop in `Promise.all`. Why can production get worse?

Answer: One request gets faster, and 20 concurrent list calls try to open a huge number of queries at once. The pool queues, or the database stalls, and every other route slows down. Batch the work, or cap partner calls at a small concurrency with a timeout.

### NEST-438 — Batch in the service

**Difficulty:** Intermediate

**Category:** Data access

**Question:**

How do you remove a service-level N+1 without adding a dataloader framework?

**Answer:**

Collect the ids, query once, and index the rows in a `Map`. `users.find({ where: { id: In(userIds) } })` is one round trip. A join is better when the database should filter and paginate in the same statement, so you do not pull parent rows you will throw away. Keep that query in the service that owns the use case. A per-row call into another service often opens its own transaction and brings the N+1 back. If the extra work is HTTP, use the partner’s batch endpoint. Cache stable lookups, such as tax rates, for a short time.

**Follow-up:**

`In(userIds)` is fine in tests and times out in production. What size did you forget?

Answer: A client sent a huge `take`, so the `IN` list and the `Map` are enormous. Cap `take` in the DTO with something like `@Max(100)`. A job that needs every row should page through a few hundred at a time in a worker, not inside the HTTP request.

### NEST-439 — cache-manager TTL on Nest 10

**Difficulty:** Intermediate

**Category:** Caching

**Question:**

How do you register `CacheModule` in Nest 10, and what unit is `ttl` in cache-manager v5?

**Answer:**

Nest 10’s `@nestjs/cache-manager` sits on cache-manager v5, and `ttl` is milliseconds. `CacheModule.register({ isGlobal: true, ttl: 10000 })` keeps entries for ten seconds. Inject the store with `@Inject(CACHE_MANAGER)`. `get` returns `undefined` on a miss. `set(key, value, ttl)` overrides the TTL for that entry, again in milliseconds. The memory store is per process. Several instances need a Redis store so they share entries. Cache plain JSON-safe DTOs. An ORM entity can carry methods and lazy state you do not want to freeze in Redis. Any user-specific value needs the user id in the key.

**Follow-up:**

A Nest 8 snippet uses `ttl: 5` for five seconds. What does Nest 10 do with it?

Answer: The entry expires in five milliseconds, so the route stays cold and you may add a Redis hop for nothing. Check the cache-manager major version and test that a value is still present after one second.

### NEST-440 — `CacheInterceptor` and private responses

**Difficulty:** Senior

**Category:** Caching

**Question:**

`CacheInterceptor` on `GET /me` made the route fast, then showed one user another user’s profile. Why?

**Answer:**

The default interceptor builds the cache key from the URL. `GET /me` is the same URL for every caller, so the first profile is stored and served to the next caller. A shared Redis store spreads that mix-up across pods. Override `trackBy` to include `req.user.id` and the URL, and return `undefined` when there is no user so the response is not stored. Public identical responses, such as `GET /plans`, fit the default key. Also send `Cache-Control: private` on user-specific responses so a shared proxy does not cache them.

**Follow-up:**

The key includes the user id. After a password change, what does the user still see?

Answer: The old DTO until the TTL ends. A disabled account can keep getting a cached `200` if you return the body without re-checking the ban. Delete that user’s keys on security-sensitive writes, or keep those TTLs to a few seconds.

### NEST-441 — Stampede and invalidation

**Difficulty:** Staff

**Category:** Caching

**Question:**

A popular cache key expires and fifty Nest requests rebuild it at once. How do you stop that, and how do you invalidate on write?

**Answer:**

That herd is a stampede: many misses and many identical queries. Let one request compute while the others wait, or serve a slightly stale value while one worker refreshes. A Redis `SET key lock NX` with a short expiry picks the winner, and the expiry matters so a crashed winner does not block the key. On update or delete, remove keys you can name, such as `user:${id}:profile`. Caching whole search pages makes deletion a guess, so use a short TTL when you cannot name the keys. `cache.reset()` on every write clears the store and starts a new stampede.

**Follow-up:**

The refresh throws and you cache nothing. What should callers get?

Answer: If you drop the last good value, every waiter misses again and the database takes the hit you were avoiding. Keep the stale DTO, set a short backoff, and log the failure. Return `503` only when you have nothing stale and the dependency is down.

### NEST-442 — Where compression should run

**Difficulty:** Intermediate

**Category:** HTTP performance

**Question:**

Where should gzip or Brotli run for a Nest API, and when does `compression()` inside Node hurt?

**Answer:**

Compression spends CPU to send fewer bytes, which helps large JSON over a slow link. If nginx, the load balancer, or a CDN already compresses, do it there and leave the Nest event loop for application work. Compressing twice wastes CPU. In the app, `compression({ threshold: 1024 })` skips tiny bodies, and you should skip images and zip files that are already compressed. Turn it off for server-sent events. The middleware buffers a gzip chunk, which delays the first event and can hold the stream until it ends.

**Follow-up:**

A review says gzip on this API is a security finding. What are they describing?

Answer: A BREACH-style leak: compression plus a secret in the body plus attacker-controlled reflected input can reveal the secret from response sizes. A JSON API that does not reflect request data next to a secret is a weak fit. Stop reflecting input on any HTML page that also contains a token, or skip compression on that route.

### NEST-443 — Keep-alive and intermittent 502s

**Difficulty:** Senior

**Category:** HTTP performance

**Question:**

Nest behind a load balancer returns intermittent `502` under light traffic. How do keep-alive timeouts explain it, and what do you set?

**Answer:**

Keep-alive reuses the TCP connection. Many load balancers leave idle connections open for about 60 seconds, while Node’s default `keepAliveTimeout` is 5 seconds. The balancer then sends a request on a socket Node already closed, and the client sees `502`. Set Node’s timeout above the balancer, and set `headersTimeout` a little higher than `keepAliveTimeout`, which Node requires. `65000` and `66000` match a 60-second edge. Use your real number. On Fastify, set the same knobs in the adapter options. Give outbound `HttpService` calls a keep-alive agent so each partner request does not pay a new handshake.

**Follow-up:**

You raised `keepAliveTimeout` and shutdown now sits for about a minute. Why?

Answer: `server.close()` stops new connections, and idle keep-alive sockets can stay open until that timeout. On Node 18.2 and later, `closeIdleConnections()` at the start of shutdown drops those idle sockets so clients reconnect to another pod. Leave active requests alone until the grace period is nearly over.

### NEST-444 — Profiling the Nest process

**Difficulty:** Intermediate

**Category:** Profiling

**Question:**

A route is slow in production and fast on a laptop. How do you profile Nest without guessing which interceptor is at fault?

**Answer:**

Separate time inside Node from time spent waiting. Log `performance.now()` around `next.handle()` with the route template, not the raw URL, and compare that with the database client’s query time. The gap is service CPU, serialization, and the framework. Profile `node dist/main.js`, not `start:dev`, with `node --cpu-prof` or `node --inspect` while a load tool hits one URL. Look for `JSON.stringify`, class-validator, `instanceToPlain`, and bcrypt. A profile that is mostly waiting means Postgres, Redis, or the network. Reproduce with production-sized payloads.

**Follow-up:**

Can you use timings taken under `start:dev`?

Answer: No. Those timings include the compiler and the file watcher, so profile `node dist/main.js` with the `NODE_ENV` you ship. Absolute latency still needs a run near the database, because a laptop query hides cross-zone delay.

### NEST-445 — Event-loop delay versus database time

**Difficulty:** Intermediate

**Category:** Profiling

**Question:**

Average latency looks fine, but p99 climbs and the health check times out while Postgres looks idle. What do you measure in the Nest process?

**Answer:**

The event loop is one thread. A long synchronous stretch delays every request, including `/health`, and the database looks idle because Node has not started the next query. `monitorEventLoopDelay` from `node:perf_hooks` gives you a delay histogram. Log a high percentile on an interval. Spikes that line up with `JSON.parse`, class-validator, image decoding, or synchronous crypto are the bug, and garbage-collection pauses show up here too. If loop delay stays near zero while p99 is high, you are waiting on a pool, DNS, a lock, or a downstream timeout. Time the query and the HTTP client separately.

**Follow-up:**

The health check runs `SELECT 1`. Why does that make an incident worse?

Answer: When the pool is exhausted, the probe waits in the same queue and the orchestrator kills the pod. Liveness should only show that the event loop is moving, and readiness can check the database with a short timeout. Keep I/O interceptors off the liveness handler.

### NEST-446 — Shutdown that drains instead of hanging

**Difficulty:** Staff

**Category:** Shutdown

**Question:**

How does `enableShutdownHooks()` interact with in-flight requests and the database pool?

**Answer:**

`app.enableShutdownHooks()` listens for `SIGINT` and `SIGTERM` and runs `onModuleDestroy`, then `beforeApplicationShutdown`, then `onApplicationShutdown`. `app.close()` stops accepting new HTTP connections and waits for the ones in progress. Close the TypeORM or Prisma pool only after those requests finish. Closing it in `onModuleDestroy` while handlers still run makes them fail with a dead connection. Never closing it leaves the process until Kubernetes sends `SIGKILL` at the end of `terminationGracePeriodSeconds`. Drop idle keep-alive sockets at the start of shutdown, give active work a deadline that fits the grace period, and stop cron and workers from taking new jobs on the same signal.

**Follow-up:**

Readiness goes false on `SIGTERM`, and the process still serves traffic for 20 seconds. Is that a bug?

Answer: No. Readiness false removes the pod from the Service so new calls go elsewhere, while the process finishes work it already accepted. Liveness should stay healthy during that drain, or the kubelet kills the pod and the drain never happens.

### NEST-447 — JSON body limits

**Difficulty:** Intermediate

**Category:** Payload limits

**Question:**

What body-size risk does a NestJS 10 Express app have by default, and how do you tighten it without breaking webhook signatures?

**Answer:**

Nest turns on Express’s JSON parser, which accepts roughly 100kb and then returns `413`. That cap is still enough for a deep object that makes class-validator burn CPU, and `JSON.parse` is synchronous, so a burst stalls the event loop. Set an explicit limit. For a signed webhook, create the app with `rawBody: true` and check the HMAC against `req.rawBody` before you trust the parsed object. Raise the limit only on the route that needs it. A global multi-megabyte cap, added for one import, gives every endpoint the expensive parser. Put large imports on their own route or a queue.

**Follow-up:**

A client sends 50mb with `Content-Type: application/json` and the limit is 50kb. When does Node hold those bytes?

Answer: A parser that enforces the limit stops as the body streams, around the cap, so the controller should never see the full object. You still pay for the bytes received so far, times concurrency. Confirm the limited parser is actually installed, and expect `413` before the handler runs.

### NEST-448 — One expensive route as a denial of service

**Difficulty:** Senior

**Category:** Availability

**Question:**

The global throttle is 100 requests a minute. One authenticated user still pins CPU with `POST /reports`. How do you design that route?

**Answer:**

A global counter is too coarse when one call runs a wide query or builds a PDF. Give the route its own tight `@Throttle` and enqueue the work, returning `202` with a job id. Cap the date range and page size in the DTO, and set a statement timeout so a bad query dies in the database. Do not accept a regular expression from the client. Nested quantifiers are a ReDoS risk on a long string. Run the worker as its own process so a PDF cannot block the API event loop.

**Follow-up:**

The queue and the API share one Node process. Did you isolate the cost?

Answer: CPU work in that process blocks the same event loop as user traffic, so the API should only enqueue. A separate worker can be scaled on its own. An in-process fallback still needs a concurrency cap and a timeout.

### NEST-449 — What breaks when you add replicas

**Difficulty:** Staff

**Category:** Scaling

**Question:**

You scale Nest to three replicas. Which in-memory behavior breaks, and when is a sticky cookie the wrong fix?

**Answer:**

Each process keeps its own Throttler map, memory cache, sessions, WebSocket adapter, and queue, and `@Cron()` runs on every replica. Clients then see multiplied limits, lost sessions, and socket events that never leave the publishing pod. A sticky cookie hides the session bug until that pod dies. Put sessions, throttles, cache, and the socket adapter in Redis, and use a lock so cron runs once. Stickiness still fits the WebSocket connection, together with Redis so any pod can reach the socket. Bearer-token HTTP does not need a sticky cookie.

**Follow-up:**

Users get random `401`s after login. Sessions are in memory and the balancer is not sticky. What is the smallest correct change?

Answer: Store the session in Redis or the database and keep only the session id in the cookie. Stickiness hides the bug until a pod dies, and it does not fix cron or sockets. If the credential is a signed JWT, compare `JWT_SECRET` across pods and check whether revocation state lives in memory.

### NEST-450 — Express and Fastify do not share these controls

**Difficulty:** Intermediate

**Category:** Adapters

**Question:**

You switch a Nest 10 app from Express to Fastify for throughput. Which security and performance settings do not move with it?

**Answer:**

Nest decorators stay. The server under them does not. Register `@fastify/helmet` on the Fastify instance, or the headers never appear. Replace `app.set('trust proxy', 1)` with Fastify `trustProxy`, or throttler keys show the proxy. `FileInterceptor` stays on Express. Fastify uploads use `@fastify/multipart` and its own `fileSize`, and JSON limits move to `bodyLimit`. Use `@fastify/compress` or the proxy, and set `keepAliveTimeout` in Fastify options. `app.use` still runs, but it is not Fastify’s fast path. The adapter change does not fix N+1, SSRF, or a per-process store.

**Follow-up:**

A test reports that `X-Content-Type-Options` disappeared after the move. What do you add before the next deploy?

Answer: `curl -I` a public route and an authenticated route and assert `nosniff`, your frame policy, and CSP. Put that in CI, and also send a JSON body over the limit and a file over the upload cap. Expect `413` or the upload error, not only `200` on `/health`.
