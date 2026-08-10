# 06. Part E - Design / deeper-dive questions

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

Use these for the "let's talk through a scenario" portion of an interview. Answer in 3-5 sentences, out loud.

**E1. Design a typed API response state for a screen that fetches a user profile. Walk through your reasoning.**
> "I'd model it as a discriminated union: `{ status: 'idle' } | { status: 'loading' } | { status: 'success'; data: UserProfile } | { status: 'error'; error: string }`. The shared `status` literal lets me narrow safely in a `switch` and only access `data` or `error` where they actually exist, and I'd add exhaustiveness checking with a `never`-typed default case so adding a new status later - like `'stale'` for background refetch - forces me to handle it everywhere it's rendered instead of silently falling through."

**E2. You inherit a codebase full of `any`. How do you approach reducing it without a full rewrite?**
> "I wouldn't try to eliminate all of it at once - I'd start with `noImplicitAny` if it's off, fix the resulting errors incrementally, and prioritize boundaries first: API response shapes, function parameters on frequently-called utilities, and anything touching money/auth logic, since those are highest-risk. For genuinely unknown-shaped data, I'd replace bare `any` with `unknown` plus explicit narrowing or a runtime validator like `zod`, rather than guessing at a type that might be wrong. I'd track progress with the TypeScript compiler's error count as a rough metric and treat new code as `any`-free from day one via lint rules (`@typescript-eslint/no-explicit-any`)."

**E3. Explain, end to end, how you'd type and validate a NestJS "create user" endpoint so a bad request can never reach the database layer, and a password hash can never leak in the response.**
> "A `CreateUserDto` class with `class-validator` decorators (`@IsEmail`, `@MinLength`, etc.) validated by a global `ValidationPipe` - so malformed input is rejected before it reaches the controller body. The service maps the validated DTO to the entity, hashes the password, and saves it. For the response, I never return the raw entity - I explicitly construct or map to a `UserResponseDto` that simply has no `passwordHash` field, and back that up with `class-transformer`'s `@Exclude()` on the entity plus a `ClassSerializerInterceptor`, so even if someone accidentally serializes the entity directly later, the sensitive field still can't leak."

**E4. A colleague suggests replacing all `enum`s in the codebase with union-of-string-literal types. What's your take?**
> "I'd generally agree for anything that represents API-facing or DTO field values, since literal unions are fully erased with zero bundle cost and interop more naturally with plain string data coming from JSON. I'd push back only where an enum's grouping/namespacing (`Status.Active`) or, for numeric enums, an implicit ordering is genuinely used somewhere in the codebase - those would need a deliberate replacement (like an `as const` object) rather than a blind find-and-replace."

**E5. How would you explain the event loop to a junior engineer debugging a `setTimeout(fn, 0)` that "doesn't run first"?**
> "I'd draw three things: the call stack, the macrotask queue, and the microtask queue. I'd explain that a 0ms delay is a minimum, not a promise of immediacy - the callback still has to wait in the macrotask queue until the current script finishes and the entire microtask queue (any pending Promise `.then` callbacks) is fully drained. I'd then have them add a `Promise.resolve().then(...)` alongside the `setTimeout` and predict the order together, since seeing it side by side makes the priority concrete rather than abstract."

**E6. Your team wants to migrate a large service layer from `any`-typed request/response objects to precise DTOs. How do you sequence the migration to avoid a big-bang rewrite?**
> "I'd start at the boundaries - controller input DTOs first, since `class-validator` gives an immediate, high-value safety net for user input - then response DTOs, since leaking sensitive fields is a real risk, before moving inward to internal service method signatures. I'd derive DTOs from existing entity types with `Omit`/`Partial`/`Pick` rather than hand-duplicating fields, so drift is caught by the compiler automatically. I'd land this incrementally, endpoint by endpoint, behind normal code review, rather than attempting to type the entire service layer in one pass."

**E7. Why might two engineers disagree about whether to use `Promise.all` or a manually concurrency-limited batch runner for 200 API calls?**
> "`Promise.all` fires all 200 requests essentially at once, which risks overwhelming the server, hitting rate limits, or exhausting client-side connection limits. A concurrency-limited batch runner caps how many run simultaneously (say, 10 at a time), trading total wall-clock time for safety and predictability. The right choice depends on the target API's rate limits and the acceptable latency - for an internal, robust service, `Promise.all` might be fine; for a rate-limited third-party API, a batch limiter is usually the safer default."

---
