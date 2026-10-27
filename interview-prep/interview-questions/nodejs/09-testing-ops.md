# NODE09 — Testing and operations

Node.js 20/22. Questions NODE-401–NODE-450.

These questions cover `node:test`, Jest, and Vitest; module and timer mocks; snapshot limits; integration tests and Testcontainers; CI, flakes, and coverage; contract tests; k6 and load-testing concepts; metrics, logs, and traces; OpenTelemetry; SLOs and error budgets; blue-green, canary, and rolling deploys; health checks; feature flags; config and secrets; zero-downtime shutdown; and container memory versus the V8 heap.

Run tests on the same Node you ship. Mock the edges you own, measure what users feel, and drain the process before it exits.

### NODE-401 — When node:test is the right runner

**Difficulty:** Intermediate

**Category:** Test runners

**Question:**

When would you choose Node’s built-in test runner over Jest for a Node 22 backend?

**Answer:**

I choose `node:test` when the service is plain Node and the tests should run on the same runtime as production, with no extra framework to upgrade. On Node 20 and 22 you start it with `node --test`, write `describe` and `it`, and assert with `node:assert/strict`. Files run in child processes, and the runner includes mocks and fake timers. You give up Jest’s matcher library, snapshot workflow, and plugins. For a small API that trade is worth it. If the repo already uses Vite for a frontend, Vitest is the closer fit.

**Follow-up:**

How do you run one file or one test name?

Answer: Pass the file path to `node --test`. Add `--test-name-pattern` to match one name and `--test-skip-pattern` to skip. Pin the Node version in CI so those flags match that release’s docs.

### NODE-402 — Jest and Vitest on a Node service

**Difficulty:** Intermediate

**Category:** Test runners

**Question:**

How do Jest and Vitest differ for a Node 22 HTTP service, and what would you standardize on?

**Answer:**

Jest is familiar: hoisted mocks, fake timers, snapshots, and a large ecosystem. On Node 22 it still prefers CommonJS unless you opt into a stricter ESM mode, and that config is where teams lose time. Vitest is ESM-first, uses a Jest-like API, and is fast when the repo already has Vite. A backend-only package still takes Vite on as a test dependency. I use `node:test` for a small service, Vitest when Vite is already there, and Jest when the suite is already Jest.

**Follow-up:**

When does Vitest’s forks pool beat threads for an API suite?

Answer: Use forks when tests open ports, mutate `process.env`, or load native addons, because each worker is its own process. Threads are faster for pure unit tests and can leak that shared state across files.

### NODE-403 — What to treat as stable in the runner

**Difficulty:** Junior

**Category:** Test runners

**Question:**

Which parts of `node:test` can you rely on in Node 20 and 22, and which do you re-check on upgrade?

**Answer:**

The stable core is `node --test`, `describe`, `it`, hooks, `node:assert`, and skip or only. Mock functions (`mock.fn`, `mock.method`) and mock timers are the right unit-test tools on both lines. I re-check three things on every upgrade: the coverage flag, ESM `mock.module` and its experimental switch, and snapshot helpers. Those moved during the 20 and 22 lines. CI should pin an exact version, such as `22.14.0`, so a runner change arrives with a changelog read. I also watch open handles. `--test-force-exit` hides a server or timer the test forgot to close.

**Follow-up:**

Why is a forced exit a smell even when it makes CI green?

Answer: The process exits while a timer, server, or socket is still open. Production would hang on shutdown for the same leak. Close the handle in `t.after`, and keep the forced exit only as a short-lived unblock with a ticket.

### NODE-404 — Mocking an ES module with node:test

**Difficulty:** Senior

**Category:** Mocking

**Question:**

How do you mock an ES module with `node:test` on Node 22, and why is it unlike Jest?

**Answer:**

`mock.module` replaces a module URL for imports that happen after you register it. Call it, then dynamically import the code under test, and pass `namedExports` for the fake. The specifier must match the import, including a `.js` extension when the source uses one. There is no hoist. A static import above the mock binds the real module and the fake never applies. It also does not fill `require.cache`, so a CommonJS `require` needs another seam. Confirm the experimental flag on your pinned Node 22, and restore the mock before the next test.

**Follow-up:**

A teammate mocks `fs` in every service test. What do you recommend instead?

Answer: Wrap filesystem access in a function the service already calls, and pass a fake into that function. When the behavior is “this JSON landed on disk,” use a temp directory from `fs.mkdtemp`. That catches path and encoding bugs a mock of `fs.promises.writeFile` skips.

### NODE-405 — Why Jest mocks appear to run first

**Difficulty:** Intermediate

**Category:** Mocking

**Question:**

Why does `jest.mock('./client')` seem to run before the imports, and how does that fail on native ESM?

**Answer:**

Babel-Jest hoists `jest.mock` above the `require` calls it generates, so a CommonJS test can write the mock below the import and still see the fake. A Node 22 ESM file uses a static import, which is linked before the module body runs. If the runner does not rewrite it, the mock line is too late. Jest’s native ESM path does not behave like that old hoist. The portable fix is to pass the client in: `createApp({ client })`. Keep `jest.mock` on legacy CommonJS boundaries.

**Follow-up:**

What is the difference between a factory mock and a manual mock?

Answer: A factory mock passes the fake into `jest.mock`, so it lives next to the test. A manual mock is a file under `__mocks__`, and Jest uses it wherever that module is mocked. Factories stay local, while a manual mock can surprise a test that needed the real client.

### NODE-406 — Dependencies you should not mock

**Difficulty:** Intermediate

**Category:** Mocking

**Question:**

Which dependencies do you refuse to mock in a Node service test, and what do you do instead?

**Answer:**

I refuse to mock the behavior that might be the bug: my own domain functions, framework routing, JSON parsing, and the SQL a query builder emits. A useful fake is a narrow collaborator I own, such as a repository, a clock, or a mailer. Third-party SDKs get a thin wrapper so tests never import the SDK. Postgres, Redis, and the network stay real in a small integration suite. Unit tests never open them. If a function only becomes testable by mocking five imports, it is too coupled.

**Follow-up:**

How do you test code that calls global `fetch` without stubbing the global?

Answer: Pass `fetch` in, and default the parameter to the global function. The unit test supplies an async function that returns a canned `Response`. One integration test hits a local stub server so timeouts and bad bodies stay honest.

### NODE-407 — Fake timers and hangs

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

How do fake timers work in `node:test` and in Jest or Vitest, and how do they hang a suite?

**Answer:**

Fake timers replace `setTimeout`, `setInterval`, and often `Date` with a clock the test controls. In `node:test` I enable the APIs I need, run the code, advance with `tick`, and reset in an `after` hook. Jest and Vitest use `useFakeTimers`, then `useRealTimers` on the way out. The suite hangs when code waits on a timer nobody advances, or when `runAllTimers` meets an interval that keeps rescheduling itself. I advance a known amount, I restore timers even if the assertion throws, and I leave timers real in tests that also wait on a socket.

**Follow-up:**

`Date.now()` still returns the real time after you enable fake timers. What happened?

Answer: The mock was not told to include `Date`, or the module copied `Date.now` into a constant at load time. Enable the `Date` API, and inject a `clock.now` function into code that captured the original binding.

### NODE-408 — Open handles that fail only in CI

**Difficulty:** Intermediate

**Category:** Timers

**Question:**

A Node test passes locally and sometimes times out in CI with an open handle. How do you find it?

**Answer:**

An open handle is a server, socket, timer, or keep-alive the test started and never closed. CI waits on it until the job timeout, while a laptop often exits between runs. I reproduce with a short test timeout on that file and look for `listen` without `close`, a `setInterval`, a keep-alive client, or a pool still connecting. Teardown belongs on the test context: close the server, clear the interval, end the pool. Raising the global timeout only hides the leak. If two files want the same port, bind port 0 and read `server.address()`.

**Follow-up:**

Why does port 0 matter once workers run in parallel?

Answer: The operating system picks a free port, so two workers do not both bind 3000. The test has to read the port after the server emits `listening`. A hard-coded port passes alone and fails when CI runs files together.

### NODE-409 — Limits of snapshot tests

**Difficulty:** Intermediate

**Category:** Snapshots

**Question:**

What is a snapshot test, and when is it the wrong tool for a Node service?

**Answer:**

A snapshot serializes a value and fails when a later run differs. Jest stores a `.snap` file, and Node 22 has helpers whose exact names depend on the minor, so I pin Node. Snapshots fit a stable artifact a human reviews, such as generated SQL or CLI help. They are a poor fit for HTTP bodies, logs, timestamps, and stacks with absolute paths. A snapshot says the blob changed, not which field must stay true. I assert status, code, and id directly, and I keep a snapshot only when it is small and free of clocks and random ids.

**Follow-up:**

A pull request updates dozens of snapshots because a formatter changed. What do you ask for?

Answer: Ask for a change that only updates the formatter and the snapshots, with no behavior mixed in. Read the diff for a real payload change. If the snapshots hold dates, stacks, or full bodies, replace them with field assertions before you accept the update.

### NODE-410 — Snapshots worth keeping

**Difficulty:** Junior

**Category:** Snapshots

**Question:**

Give two Node cases where you would keep a snapshot on purpose.

**Answer:**

The first is a generator whose contract is the whole document: an email body, a SQL migration, or a rendered manifest. I commit that snapshot and review it like source. The second is a sorted public error catalog: code, HTTP status, and message key. Drift there breaks a client that branches on a code. I still assert one example in a normal expect so the shape is visible without opening the snap file. Timestamps, random ids, and stack traces stay out of both.

**Follow-up:**

How do you keep that snapshot deterministic in CI?

Answer: Sort keys, replace ids and timestamps with placeholders, and run the job with `TZ=UTC`. Convert `Map` and class instances to plain objects yourself so the serializer’s extra formatting is not the contract.

### NODE-411 — Unit, integration, and end-to-end

**Difficulty:** Junior

**Category:** Test strategy

**Question:**

How do you split unit, integration, and end-to-end tests for a Node HTTP API?

**Answer:**

A unit test calls a function with fakes and checks one behavior. It does not bind a port or open Postgres. An integration test boots the real router and real data access against a disposable database and calls it over HTTP, which proves validation, auth, SQL, and status codes. An end-to-end test runs the deployed artifact and walks one client path. I keep many unit tests, fewer integration tests, and a handful of end-to-end checks on login and on a write that must not be lost. A rollback when the mailer throws belongs in an integration test.

**Follow-up:**

Where does an in-process HTTP call, such as Fastify `inject` or Supertest without `listen`, sit?

Answer: It is an integration test of routing and middleware that never opens a socket, so port flakes disappear. It does not cover keep-alive or `server.close`. Add a few `listen(0)` tests when the change is about shutdown or timeouts.

### NODE-412 — Integration-testing a write

**Difficulty:** Intermediate

**Category:** Integration tests

**Question:**

How do you integration-test `POST /orders` on Node 22 so tests do not share rows?

**Answer:**

I migrate once per suite against a disposable Postgres, then give each test a clean slate with a rollback or a truncate. The app is built with the test database URL, not a developer `.env`. The test posts a body, expects 201, and reads the row back so a handler cannot return success without committing. Invalid input expects 400 and zero rows. A failed payment collaborator expects no order, which locks the transaction boundary. Each test uses its own idempotency key. Parallel workers get separate schemas or containers.

**Follow-up:**

Why read the row back instead of trusting the JSON response?

Answer: The handler can return 201 and forget the commit, or store a different total than the JSON. The response is what the client saw, and the row is what the business kept, so a write should check both.

### NODE-413 — Choosing a test database

**Difficulty:** Intermediate

**Category:** Integration tests

**Question:**

What are the realistic Postgres options for a Node test suite, and which do you recommend?

**Answer:**

A local `app_test` database is fast and it drifts: wrong version, missing extensions, leftover rows. A CI service container plus Compose for laptops pins the version. Testcontainers starts that same image from the test process. I want one pinned major everywhere, migrations from the same command production uses, and tests that insert their own rows. Truncate between tests, or roll back, unless the code opens its own transaction, because an outer transaction hides that bug. I never point tests at shared staging.

**Follow-up:**

The suite is slow because every file runs migrations. What do you change?

Answer: Migrate once for the life of the container, then isolate tests by truncate or by schema. A container per test is the expensive mistake. If migrations are still slow, dump a migrated template and create test databases from it.

### NODE-414 — Testcontainers without a miserable CI

**Difficulty:** Intermediate

**Category:** Testcontainers

**Question:**

What is Testcontainers, and how do you use it in Node without making every pull request slow?

**Answer:**

Testcontainers starts real Docker containers for a test and removes them afterward. A Postgres or Redis module gives you a host port and a URL. Start it in a suite `before` hook, pass the URL into the app, and stop it in `after`. You get real SQL and the production image, and you pay for Docker in CI plus a few seconds of startup. I start one container per worker, not per test, and I pin a major such as Postgres 16. Unit tests stay in process. If Docker is missing, fail with a clear message.

**Follow-up:**

CI cannot connect to the Docker socket. What do you check first?

Answer: The job is inside a container that does not mount the Docker socket, or the runner has no daemon. Use the provider’s service container, or a runner that supports Docker the way that vendor documents. Do not delete the integration job and call the pipeline green.

### NODE-415 — When to skip Testcontainers

**Difficulty:** Junior

**Category:** Testcontainers

**Question:**

When do you skip Testcontainers?

**Answer:**

I skip it for pure functions and for handlers whose repository is already a fake. I skip it on a pull-request lane that must finish in a couple of minutes without Docker. A SaaS I cannot run, such as a card network, gets a contract or a recorded fixture plus a scheduled sandbox smoke. A clock should be an in-memory fake. SQL semantics, unique indexes, and Redis expiry are where a real engine earns the container. If laptops cannot run Docker, Compose plus a CI service is easier to support.

**Follow-up:**

How do you test Redis expiry without sleeping in the whole suite?

Answer: One test against a real Redis can use a one-second TTL and a short wait. The rest of the suite fakes the cache interface. I do not sprinkle multi-second sleeps through unrelated tests.

### NODE-416 — What CI must block

**Difficulty:** Intermediate

**Category:** CI

**Question:**

Which stages do you want in CI for a Node 22 service, and which of them block a merge?

**Answer:**

The merge lane stays fast: install from the lockfile, lint, typecheck, unit tests, and a build. Stable integration tests can block too if they finish in a few minutes. Image build, a vulnerability scan, and a migration dry-run can block on the way to main. Staging deploy and end-to-end smoke run after merge so a flaky sandbox cannot freeze every pull request. Load tests run on a schedule or before a risky release. I fail the job on a bad test exit, lockfile drift, and a secret scan. Coverage is a report unless the team agreed a ratchet.

**Follow-up:**

Why `npm ci` instead of `npm install` in CI?

Answer: `npm ci` deletes `node_modules` and installs the lockfile exactly, and it fails if `package.json` disagrees. `npm install` may rewrite the lockfile and produce a tree nobody reviewed. CI should reproduce a known tree.

### NODE-417 — Caching installs safely

**Difficulty:** Intermediate

**Category:** CI

**Question:**

How do you cache Node installs in CI, and which cache key causes “works on my branch” failures?

**Answer:**

I cache the package-manager store, keyed by the lockfile plus OS, libc, and Node version, and I still run a frozen install. Native addons are built for one ABI, so a Node 20 cache restored onto Node 22, or Ubuntu onto Alpine, loads binaries that fail to open. Publish jobs that must be reproducible can skip the cache. A hit that skips lifecycle scripts can skip a needed postinstall. When a job is mysteriously broken, bust the cache once, then fix the key so the bad entry cannot return.

**Follow-up:**

pnpm fails in CI with a lockfile error and works on a laptop. What does that usually mean?

Answer: `package.json` and the lockfile disagree, or CI’s pnpm is not the version that wrote the lockfile. Pin pnpm with the `packageManager` field and Corepack, and run a frozen install.

### NODE-418 — What to shard and what to keep serial

**Difficulty:** Intermediate

**Category:** CI

**Question:**

Which parts of a Node pipeline do you shard, and which do you keep in one job?

**Answer:**

Unit tests shard by file because they share nothing, which cuts wall-clock time. Integration tests shard only when each shard has its own schema or container. One shared Postgres plus truncate-all will race. Lint and typecheck stay one job unless the repo is a monorepo with project references. The image build stays one job per service so the digest is clear. Deploys of the same service must not overlap. I cancel in-progress pull-request tests, and I leave production deploys alone. A merge queue re-runs blocking tests on the latest main.

**Follow-up:**

Tests pass in shards and fail when run as one process. Why?

Answer: A file is relying on another file’s side effect: a global registered once, a seed row, or module state. Shards hide that by luck of grouping. Give the file its own setup, and treat the single-process run as the one to trust until the suite is isolated.

### NODE-419 — What a flake is in Node

**Difficulty:** Intermediate

**Category:** Flaky tests

**Question:**

What is a flaky test, and what usually causes flakes in a Node suite?

**Answer:**

A flake passes and fails on the same commit. People then stop trusting the suite, which is worse than a missing test. In Node the usual causes are time, shared module state, a missing `await`, a floating promise, a port clash, a unique-key collision, and a real call to a third party. A short `setTimeout` passes on a laptop and fails when CI steals CPU. I loop the file until it fails. If it only fails in parallel, I run the two files that share a resource until the collision shows.

**Follow-up:**

How many automatic retries do you allow in CI?

Answer: Zero is the default. One retry can absorb a known infrastructure blip if it files a ticket and stays loud. Retrying until green, with no owner, trains the suite to be random, so I would rather skip the test with an owner and an expiry.

### NODE-420 — Fixing a flake you can barely reproduce

**Difficulty:** Senior

**Category:** Flaky tests

**Question:**

How do you fix a Node test that fails about one time in twenty?

**Answer:**

I make the failure deterministic before I touch production code. I log the timestamps, ids, and order the assertion saw, replace wall-clock time with an injected clock, and await every promise. The process should fail on an unhandled rejection. The test gets its own rows and its own port. If the race is in the product, I fix the product and keep the assertion strict. I do not widen an expect so both 200 and 500 pass. Quarantine is last: skip with an issue link and a date, and fail CI when that skip outlives the date.

**Follow-up:**

A test expects row order from a query with no `ORDER BY`. Is that a flake?

Answer: Yes. Postgres does not promise order without `ORDER BY`, and a vacuum or an upgrade can change it. Add the order to the query if the API promises it, or sort inside the assertion if it does not.

### NODE-421 — What coverage does and does not prove

**Difficulty:** Junior

**Category:** Coverage

**Question:**

What does test coverage tell you on a Node service, and what does a high percentage fail to prove?

**Answer:**

Coverage counts which lines, statements, functions, or branches ran while the tests executed. Node’s runner can collect that from V8; c8 and Istanbul do the same job from outside. A line that ran is not a line that was checked. A test can visit every branch and assert nothing. Coverage also misses a wrong SQL filter that still returns rows, and a missing requirement. I use the report to find code no test touches, especially a new `catch` that swallows errors. I read the uncovered diff on a pull request more closely than the repository-wide percentage.

**Follow-up:**

What is the difference between line coverage and branch coverage?

Answer: Line coverage asks whether a line executed. Branch coverage asks whether each side of a decision ran, including both sides of a short-circuit condition. A line can be covered while its error path never ran, so I turn branch coverage on for domain code.

### NODE-422 — Coverage gates that do not block refactors

**Difficulty:** Intermediate

**Category:** Coverage

**Question:**

How do you enforce coverage in CI without blocking every refactor?

**Answer:**

I publish the report on every run and gate only what we mean. Changed lines in domain packages should be covered. The global number can be a ratchet that may rise and must not fall past a step the team agreed. Generated clients, migrations, and config files stay out of the denominator. I would fail a drop in payments or auth, not a tiny dip across a monorepo. Thresholds live in CI config. I do not require 100 percent. A new `catch` is tested or marked with a reviewed reason. Keep the HTML report so a red gate is explainable.

**Follow-up:**

When is an ignore comment on a `catch` acceptable?

Answer: Only for a path you can explain as unreachable, with a one-line comment that says why. A catch that handles a database error, a timeout, or a validation failure has to be tested. Those are the branches production hits.

### NODE-423 — Contract tests versus integration tests

**Difficulty:** Intermediate

**Category:** Contract tests

**Question:**

What is a contract test between two services, and how is it different from an integration test?

**Answer:**

A contract test locks the agreement at a boundary. The consumer states the requests it sends and the responses it needs, and the provider shows it still honors that. The two services do not have to boot together. An integration test runs the pieces in one process or one compose file and checks a scenario. I use contracts when teams deploy independently and staging is too late to learn that a field changed type. I write them for fields clients branch on. A failure should name the consumer, the interaction, and the field.

**Follow-up:**

Who owns the contract, the caller or the service being called?

Answer: The caller owns the expectation, because it knows which fields it cannot live without. The provider owns verification, because only it can boot and answer. A breaking change is a versioned endpoint or an added field, agreed by both sides.

### NODE-424 — Consumer-driven contracts

**Difficulty:** Staff

**Category:** Contract tests

**Question:**

Explain consumer-driven contract testing, Pact-style, to someone who has only written Jest tests.

**Answer:**

The consumer test talks to a mock server. Each interaction, such as “this POST returns 201 and an id,” is saved as a contract and published with the consumer version. The provider’s CI downloads the contracts, replays each request against a locally booted provider, and checks the response. A broker can then say whether this consumer or this provider is safe to deploy. The consumer used a double and the provider ran its real handler. The test does not prove a migration, or that the consumer parsed types, unless those checks are written down. Keep fixtures free of production data.

**Follow-up:**

Provider verification is green and production still breaks. What did the contract miss?

Answer: Usually the provider state: verification inserted a happy-path row and skipped the empty or forbidden case. Or the contract ignored a header that matters, such as an idempotency key. Add that state on the provider and that assertion on the consumer.

### NODE-425 — Schema diffs and behavioral contracts

**Difficulty:** Intermediate

**Category:** Contract tests

**Question:**

When is an OpenAPI or JSON Schema diff enough, and when do you need a behavioral contract?

**Answer:**

A schema contract says which fields exist, their types, and which are required. A diff catches a number that became a string, or a field that disappeared. That fits when clients are generated from OpenAPI. A behavioral contract says what the service does: 409 when an idempotency key is reused, 403 for this role, tax included in the total. A schema cannot say that. I want a schema diff on every pull request, and behavioral checks for the few interactions that have caused incidents. I generate types from the spec and validate at least one real response against it.

**Follow-up:**

The handler returns a field the spec does not list. Is that a break?

Answer: It is a break if clients reject unknown fields, or if you promised a closed spec. An open object can tolerate the extra field, and the field still belongs in the spec once a caller relies on it. `additionalProperties: false` means the new field and the spec land in the same change.

### NODE-426 — What a load test is for

**Difficulty:** Intermediate

**Category:** Load testing

**Question:**

What should a load test answer for a Node API, and which numbers do you record?

**Answer:**

A load test asks how the service behaves at a stated rate, with a stated payload, for a stated time. I record successful requests per second, p95 and p99 latency, and the error rate, plus saturation: CPU throttling, event-loop lag, heap, and pool wait. An average hides the tail users feel. I separate a short smoke, a run at expected peak, a stress run past peak, and a soak for leaks. The pass rule is written first, such as p95 under a named limit and errors under 1 percent. The target needs a production-like build and a realistic data volume.

**Follow-up:**

Event-loop lag is high and CPU sits near 40 percent. What does that suggest?

Answer: The loop is stalling while other cores sit idle: a synchronous burst, a native call, or GC, on a single Node process. Look at delay metrics and a CPU profile, and talk about more processes. A SQL tweak will not help if the time is inside `JSON.parse` of a huge body.

### NODE-427 — k6 in one sitting

**Difficulty:** Intermediate

**Category:** Load testing

**Question:**

What is k6, and how does a small script say “this many virtual users, fail if p95 slips”?

**Answer:**

k6 is a load generator. You write the scenario in JavaScript, and a Go runtime runs many virtual users. It does not run inside the Node server. A script sets virtual users, duration, and thresholds, and exports a function that sends one iteration. A check records a boolean, such as status 200. A threshold fails the process exit code, which is how a pipeline can reject a build. Scenarios can ramp users instead of slamming the target. I keep scripts in the repo, take the base URL from the environment, and tag the run with the image digest.

**Follow-up:**

Checks are all green and a threshold is red. How is that possible?

Answer: Checks count assertions such as “the body has an id.” Thresholds apply to metrics such as latency, so every response can be a correct 200 and still be too slow. A red threshold fails the run, and fast 500s can fail the error-rate threshold while latency stays green.

### NODE-428 — Load tests you cannot act on

**Difficulty:** Intermediate

**Category:** Load testing

**Question:**

What mistakes make a Node load test produce a number you cannot act on?

**Answer:**

Hitting one warm route that is not the expensive one. Saturating the laptop that runs k6 before the server does. Skipping think time, or adding so much sleep that you measure the sleep. Sharing one auth token when production spends time opening connections. Using a tiny table so every query hits cache. Stopping at the first error without seeing whether the pool, the heap, or a downstream timed out. I write the scenario in one paragraph and store the summary with the digest. If I cannot name the bottleneck, it is not a capacity decision.

**Follow-up:**

The load test and production disagree by a wide margin. Where do you look first?

Answer: Data volume, indexes, and topology. The test database may fit in RAM while production does not, or production has a smaller pool or a proxy the test skipped. Compare pool wait, rows examined, and instance size before you compare application code.

### NODE-429 — Metrics, logs, and traces

**Difficulty:** Junior

**Category:** Observability

**Question:**

Define metrics, logs, and traces, and say which you open first during an incident.

**Answer:**

Metrics are numbers over time: request count, errors, a latency histogram, event-loop lag, memory. They answer whether it is broken, since when, and how wide. Logs are events with fields, and they answer what happened on one case. Traces follow one request across spans, the handler, the query, and the outbound call, under one trace id. I open metrics first for the start, the error rate, and the route that moved. Then I open a trace from a slow or failed example, and I use logs for a domain code a span does not carry.

**Follow-up:**

Why can a high-cardinality label take down the metrics system?

Answer: Each unique combination of label values is its own series. A user id or a raw URL creates millions of series, the scrape blows up, and the store falls over during the incident. Keep labels bounded, such as route template and status class, and put the user id on the log or the span.

### NODE-430 — What goes on the first dashboard

**Difficulty:** Intermediate

**Category:** Observability

**Question:**

What do you put on a Node HTTP dashboard before you invent custom business metrics?

**Answer:**

For requests I chart rate, errors, and duration: requests per second, failures, and a latency histogram. For the process I chart utilization, saturation, and errors: CPU throttling, event-loop delay, pool waiters, restarts, and out-of-memory kills. Event-loop delay belongs on a Node dashboard because a calm CPU graph can hide a blocked loop. Business counters come after the service is observable as a service. Alerts page on error rate and latency, and they ticket causes such as disk. A chart with no action should not wake anyone.

**Follow-up:**

Why store latency as a histogram instead of only an average?

Answer: An average mixes the fast majority with the slow tail, and you cannot combine averages across pods correctly later. Histograms let you compute p95 and p99 and add those buckets across instances, so the alert belongs on a percentile.

### NODE-431 — Structured logging

**Difficulty:** Junior

**Category:** Observability

**Question:**

What does structured logging mean in a Node service, and what do you refuse to log?

**Answer:**

Each event is a JSON object with stable names: time, level, message, request id, trace id, route, status, and duration. A logger such as Pino writes that cheaply and can redact paths you list. People query fields instead of regexing sentences. I bind a child logger per request so every line carries the same ids. Info is for completed requests, warn for a handled oddity, and error for a failure. I do not log tokens, passwords, card numbers, or authorization headers. Bodies stay off by default.

**Follow-up:**

Why is `console.log` of an object a problem in production?

Answer: It writes a multi-line dump with no level, no request id, and no redaction, and collectors split those lines into separate events. Use the service logger. A stray console log on a hot path is a review comment.

### NODE-432 — Correlating one request across services

**Difficulty:** Intermediate

**Category:** Observability

**Question:**

How do you correlate logs for one request across a Node API and the service it calls?

**Answer:**

I accept an incoming `traceparent` header, and a simpler request-id header from our edge if that is the local standard. If neither arrives, the first Node hop generates an id and returns it so a client can quote it. The logger stores that id with `AsyncLocalStorage`, so concurrent requests cannot swap it. Outbound calls forward the same ids, and downstream logs reuse them. Support searches one id and sees the gateway, the API, and the worker. The id identifies a request in logs. It does not grant access.

**Follow-up:**

Why is a global `let requestId` wrong on Node’s event loop?

Answer: One thread serves many requests. Request A sets the global, awaits the database, and request B overwrites it, so A’s later log line wears B’s id. `AsyncLocalStorage` keeps the id on the async resource that continues after the await.

### NODE-433 — OpenTelemetry’s pieces

**Difficulty:** Intermediate

**Category:** OpenTelemetry

**Question:**

Explain OpenTelemetry’s API, SDK, instrumentation, exporter, and collector for a Node service.

**Answer:**

The API is what application code calls to start a span or record a metric, with no vendor imports. The SDK samples, batches, and hands data to an exporter. Instrumentation creates spans around HTTP, fetch, and database drivers, or you add a span around a domain step yourself. The exporter sends OTLP to a collector, which forwards to your trace, metric, and log stores, so a vendor change does not rewrite the service. On Node 20 and 22, context rides on `AsyncLocalStorage`, so a handler span stays the parent across an await. Start the SDK before the process accepts traffic.

**Follow-up:**

Why must the SDK load before the HTTP framework?

Answer: Auto-instrumentation patches a library the first time that library loads. If Express, Fastify, or the database driver loaded first, the patch misses and you get no server spans. Import a small instrumentation module first, or preload it, then load the app.

### NODE-434 — Auto-instrumentation and hand-written spans

**Difficulty:** Intermediate

**Category:** OpenTelemetry

**Question:**

What should Node auto-instrumentation cover on day one, and which spans do you add yourself?

**Answer:**

On day one I want inbound HTTP with route template, method, and status; outbound HTTP with host, method, and status; and database spans with a sanitized statement or a query name. That shows the shape of a request without custom code. I add manual spans where the framework cannot see meaning, such as pricing or authorizing a payment, and I mark the span failed when the operation failed. Attributes stay bounded: currency or provider, never a card number or an email. Recording full SQL with bound values is a data leak, so I leave parameters off.

**Follow-up:**

A trace shows the HTTP span and nothing under it. What do you check?

Answer: The database or HTTP client instrumentation is missing, the driver was imported before the SDK, or a callback lost async context. Match the instrumentation package to the driver major, and add one manual span inside the handler as a control.

### NODE-435 — Sampling traces without losing errors

**Difficulty:** Senior

**Category:** OpenTelemetry

**Question:**

Why do you sample traces, and how do you avoid sampling away the failures?

**Answer:**

A busy service can emit more spans than you can store, so sampling keeps a fraction. Head sampling decides at the start, which keeps the trace consistent across services and can drop the one error you needed, because the decision happened before the failure. Tail sampling decides in the collector after the trace finishes, so you can keep errors and slow traces plus a small slice of the rest. The collector must see every span of that trace. I use parent-based sampling so a traced caller forces this process to stay in, and I always keep an agreed support header.

**Follow-up:**

What is the `traceparent` header in practical terms?

Answer: It carries the trace id, the parent span id, and a flag that says whether the caller kept this trace. Node reads it on the way in and writes a new one on the way out with the same trace id. If a proxy strips it, the next service starts a new trace and the picture splits.

### NODE-436 — SLI, SLO, and SLA

**Difficulty:** Intermediate

**Category:** SLOs

**Question:**

Define SLI, SLO, and SLA for a Node API in words a product manager can use.

**Answer:**

An SLI is the measurement: the share of search requests that returned successfully and quickly. An SLO is the target over a window, such as 99.9 percent for 30 days. An SLA is a customer promise with a consequence, such as credit, if you miss. The team runs on the SLO, and the SLA should be looser so there is room before a penalty. I write indicators on what users experience: availability and latency of the critical routes, plus a correctness count where you have one. Give every target an owner and a real query.

**Follow-up:**

Why not set the SLO to the best month you ever had?

Answer: That target burns whenever the month is merely normal, and people learn to ignore it. Set the SLO from the reliability users need. If they are fine at 99.9 percent and you usually beat that, the gap is room to ship.

### NODE-437 — Error budgets

**Difficulty:** Intermediate

**Category:** SLOs

**Question:**

What is an error budget, and how do you explain a simple example?

**Answer:**

The error budget is the unreliability the SLO allows. At 99.9 percent over 30 days, the budget is 0.1 percent of requests, about one thousand failures per million. Slow requests spend it too when latency is part of the indicator. A healthy budget means normal shipping. A thin budget means smaller deploys and reliability work. An empty budget triggers the policy you wrote ahead of time: pause risky launches, or roll back the change still burning it. The window rolls, so a bad hour ages out. I report budget remaining next to deploy markers.

**Follow-up:**

A customer’s retry storm burns the budget in an hour. Do you freeze the team?

Answer: First check whether the SLI counted their 400s and retries. If the indicator is about server failures and you counted bad client traffic, fix the indicator. If you truly failed those requests, hold risky launches and fix client backoff so the next window does not burn the same way.

### NODE-438 — Fast burn and slow burn

**Difficulty:** Senior

**Category:** SLOs

**Question:**

Why do SLO alerts use more than one window, and what is a fast burn versus a slow burn?

**Answer:**

An alert that fires only when the budget is empty is late. Burn alerts watch how fast you spend the budget. A fast burn spends hours of budget in minutes, a bad deploy or a hard down, and it should page on a short window confirmed by a slightly longer one. A slow burn sits a little over target all week and will empty the month if it continues, so it becomes a ticket rather than a midnight rollback. Both alerts share one indicator, and a deploy marker ties a fast burn to a release.

**Follow-up:**

The SLO is green and users are still filing tickets. What is wrong?

Answer: The indicator is missing their experience. You may count only server errors while they get empty 200s, or you may be measuring a route they do not use. Add the symptom they described, because a green target that contradicts tickets is an indicator bug.

### NODE-439 — Blue-green deploys

**Difficulty:** Intermediate

**Category:** Deployment

**Question:**

Explain a blue-green deploy of a Node service, including rollback and the database catch.

**Answer:**

Blue is live. You deploy the new image to green, run migrations that stay safe while blue still serves, and switch the router once green is ready. Blue stays warm, so rollback is a router change, not a rebuild. The catch is shared state. A migration green applies must still work for blue, because rollback sends traffic back and both colors can be in flight. Add a column, write both shapes, backfill, and remove the old shape later. Sessions stored in Node memory break the same way, so put them in a store both colors share.

**Follow-up:**

You have one database and two colors. How can green’s migration still break blue?

Answer: Any change blue cannot read or write: a renamed column, a tighter constraint, a new meaning for a column blue still updates. The router flip does not version the schema. Keep migrations compatible with the previous process.

### NODE-440 — Canary deploys

**Difficulty:** Intermediate

**Category:** Deployment

**Question:**

What is a canary for a Node API, and what telemetry lets you advance it?

**Answer:**

A canary sends a small slice of real traffic to the new version and leaves the rest on the old one. Advance only if its error rate, p95, and a business counter stay in band with the baseline on the same routes and the same minutes. Rollback sets the weight to zero. Instances must be stateless, or sessions must live outside the process, because one user can hit both versions. I keep a header that forces my own requests onto the new build before the public percent moves. Skip a canary when the migration is unsafe for the old code.

**Follow-up:**

The canary error rate is higher and someone calls it noisy customers. What do you need to see?

Answer: A split by route and status, per image digest, over the same minutes. If 5xx rises only on the new digest, hold the percent at zero. If both digests move together, the cause is downstream of the deploy.

### NODE-441 — Rolling deploys and dropped requests

**Difficulty:** Intermediate

**Category:** Deployment

**Question:**

What is a rolling deploy, and which Node behaviors make a naive rollout drop requests?

**Answer:**

A rolling deploy replaces instances in batches: start a new pod, wait until it is ready, then stop an old one. Requests drop when the process exits on SIGTERM before in-flight work finishes, when the load balancer still routes after accept has stopped, or when a long request hits the grace-period deadline. I set that grace period above the longest request we promise, fail readiness first, wait for the server to close, and close the database after. I add a pod before I remove one so a slow boot cannot shrink capacity to zero.

**Follow-up:**

What does `maxUnavailable: 0` buy you during a rollout?

Answer: The platform adds a surge pod before it removes an old one, so you stay at the desired count. The cost is a little extra capacity, and a pod that never becomes ready blocks the rollout instead of killing healthy pods to make room.

### NODE-442 — Liveness, readiness, and startup

**Difficulty:** Intermediate

**Category:** Health checks

**Question:**

Define liveness, readiness, and startup checks for a Node process, and say what each must not do.

**Answer:**

Liveness answers whether the platform should restart the process. It should succeed when the event loop can respond. Readiness answers whether the process should receive traffic. It fails while a required dependency is missing, and it fails as soon as shutdown starts. A startup probe holds liveness off until the first success, so a slow boot is not treated as a deadlock. Liveness must not call the database, or a blip restarts every pod and enlarges the outage. Readiness may check critical dependencies with a short timeout. Probes are frequent, so keep them cheap and free of side effects.

**Follow-up:**

Readiness fails on every pod because Redis is down. Is that better than failing liveness?

Answer: Yes, when Redis is required to serve. The load balancer has no healthy backends, and the processes stay up to recover, instead of restarting into the same outage. If Redis is optional, leave it out of readiness.

### NODE-443 — Slow boot and the startup probe

**Difficulty:** Junior

**Category:** Health checks

**Question:**

A Node 22 service takes about 40 seconds to listen on a small CPU limit, and Kubernetes kills it. What is happening, and what do you configure?

**Answer:**

Liveness starts failing while the process is still booting, so the kubelet kills it and the next start repeats the cycle. A small CPU limit makes this worse, because loading modules is CPU work and the cgroup throttles it. I add a startup probe whose failure budget covers the slowest boot we accept, on a cheap path. Liveness begins only after that probe succeeds. I still treat a 40-second listen as a defect when the cause is a blocking retry, a config fetch with no timeout, or a tiny CPU limit. Time-to-listen belongs in the deploy log.

**Follow-up:**

Why not only set a very high `initialDelaySeconds` on liveness?

Answer: That delay also waits before you notice a deadlock after the process has been healthy. The startup probe’s long budget applies only to boot. Liveness stays aggressive once the process has listened.

### NODE-444 — Feature flags on a Node API

**Difficulty:** Intermediate

**Category:** Feature flags

**Question:**

How do feature flags change a Node deploy, and where do you evaluate them?

**Answer:**

A flag separates “the binary is on production” from “users see the behavior.” You ship dark, enable it for staff, then for a percent of users, and you can turn it off without a rollback. I evaluate flags per request behind a wrapper, so handlers do not call a vendor SDK. The default is the old behavior when the flag service is down, unless this flag is a kill switch that must fail closed. I cache the ruleset in memory and refresh it, so an outage does not add a network hop to every request.

**Follow-up:**

How do you test both sides without doubling the suite?

Answer: Unit tests force the flag on and off only for the behavior that differs. Integration tests cover the default path, plus the new path’s critical assertion, and the wrapper proves a missing service returns the documented default. When the flag is deleted, the unused side leaves in that same change.

### NODE-445 — Killing a bad release with a flag

**Difficulty:** Intermediate

**Category:** Feature flags

**Question:**

An incident is mitigated by turning a flag off. What has to be true already, and what do you clean up?

**Answer:**

The off position has to be the last known-good behavior, still deployed, on a schema both versions can use. A flag cannot undo a destructive migration or a client that already requires the new response. The person on call needs a button or a documented call, and the process must see the new value without a restart, or a rolling restart has to be written down. Afterward I put the flag change on the error graph, then delete the dark path or finish the fix and turn it on again.

**Follow-up:**

Why is reading a flag row inside the request transaction a risky design?

Answer: Every request then depends on that read, and a flag-table incident becomes an API incident. Refresh a snapshot in the background and decide from memory. If the refresh fails, keep serving the last snapshot.

### NODE-446 — Config at startup

**Difficulty:** Junior

**Category:** Configuration

**Question:**

How should a Node 22 service read configuration, and what goes wrong when handlers call `process.env` directly?

**Answer:**

Configuration that changes between deploys lives in the environment, and the same artifact runs everywhere. One module reads `process.env` at startup, checks types and required keys, and exports a frozen object. Handlers use that object. A missing key or a bad port exits before listen, and the message names the key, not the secret. Scattered `process.env` hides the surface, pushes tests to mutate globals, and turns a typo into `undefined` on one path. `NODE_ENV` is only a coarse mode. Real behavior gets its own key, such as which payments provider to use.

**Follow-up:**

Why validate at startup instead of on first use?

Answer: First use may be the first customer, after a deploy that looked healthy. Failing at startup fails readiness and stops the rollout while old instances still serve. A lazy read also crashes some workers later than others, which makes the outage look partial.

### NODE-447 — Secrets versus ordinary config

**Difficulty:** Intermediate

**Category:** Configuration

**Question:**

How do you separate secrets from ordinary config, and what must never happen to a secret?

**Answer:**

Ordinary config may appear in a redacted startup log: port, public URL, timeouts. Secrets are credentials, such as database passwords and vendor tokens. They come from a secret manager or the platform store, as environment variables or mounted files, and they are not baked into the image or the repo. The config module reads them. Logs, spans, and error payloads must leave them out. I test that the logger masks a fake secret. If a secret hits a log, rotate it. Deleting the line is not the whole response.

**Follow-up:**

A crash handler prints `process.env` to help debug. What do you change?

Answer: That is a secret dump the moment a stack trace is shipped to a vendor. Print only the public keys the validator rejected. Keep the environment object out of the error reporter, and check its `beforeSend` hook for the same leak.

### NODE-448 — Graceful shutdown on SIGTERM

**Difficulty:** Senior

**Category:** Zero-downtime deploys

**Question:**

What does a Node 22 HTTP process do on SIGTERM so a deploy does not drop in-flight requests?

**Answer:**

You need more than one instance. On SIGTERM the process marks itself not ready, waits so the balancer stops sending work, then calls `server.close()`. In-flight requests finish. On Node 20 and 22, `closeIdleConnections()` drops keep-alive sockets that have no active request, which would otherwise hold close open until the platform kills the pod. Then close pools, flush telemetry, and exit 0. The grace period must exceed the longest request you promise. Calling `process.exit` at the top of the handler drops work the kernel already delivered. Workers stop taking jobs, finish or requeue the current one, then exit.

**Follow-up:**

Why do idle keep-alive connections stall `server.close()`?

Answer: `server.close()` waits until existing sockets end, and an idle keep-alive client never ends its socket. `closeIdleConnections()` drops those idle sockets and leaves an in-flight request alone until it finishes.

### NODE-449 — The race with the load balancer

**Difficulty:** Staff

**Category:** Zero-downtime deploys

**Question:**

The app handles SIGTERM and clients still see 502s during deploy. Where is the race, and how do you close it?

**Answer:**

The platform sends SIGTERM while proxies may still list the pod, so a new request hits a process that has stopped accepting, or hits nothing. Readiness updates are polled, not instant. Fail readiness first, wait a few seconds in a preStop hook or at the start of the handler, and only then stop accepting. During that wait the process still serves stragglers. Add the wait to the grace period so the pause plus the drain finish before SIGKILL. Prove it with a deploy under light synthetic load and a count of 502s. Also confirm the signal actually reaches Node.

**Follow-up:**

Why does `exec node server.js` matter in the container entrypoint?

Answer: `exec` replaces the shell, so Node becomes PID 1 and receives SIGTERM. A shell that starts Node as a child and does not forward the signal lets Node keep running until SIGKILL, mid-request. Use `exec`, or a small init that forwards signals and reaps zombies.

### NODE-450 — Container memory limits and the V8 heap

**Difficulty:** Staff

**Category:** Capacity

**Question:**

A Node 22 container has a 512 MiB limit and no heap flag. It dies with exit 137 and no stack trace. What happened, and how do you size the heap?

**Answer:**

Exit 137 means SIGKILL. On Kubernetes that is usually the memory limit: resident set crossed 512 MiB and the kernel killed the process before JavaScript could throw. V8’s heap is only part of that resident set. Code, stacks, native addons, and `Buffer` memory sit outside it. With no flag, V8 may grow the old space until the limit kills it. Setting `--max-old-space-size` equal to the container limit fails the same way, because off-heap memory still counts. I set the heap lower, leaving about a quarter of the limit for everything else, then confirm with a soak.

**Follow-up:**

`heapUsed` is well under the limit and the container still dies. Where did the rest go?

Answer: Compare resident memory with `heapUsed`, then look at `external` and `arrayBuffers`. Large buffers or a native library sit outside the old space and still count against the limit, so a heap snapshot will not show all of it. Lower the heap flag or raise the limit, and find what retains those buffers.
