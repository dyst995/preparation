# 10. Senior-Level Best Practices

> Source: `interview-prep/typescript-javascript/05-interview-questions-drills.md`

This chapter is a drill bank, so this section is framed as **harder senior-level follow-ups** interviewers ask *after* you get the base question right - the questions that separate "knows the definition" from "has actually operated this in production." Use it as a final-round drill once Parts A-F feel solid.

### Decision frameworks & tradeoffs (rapid recall)

- **`any` vs `unknown` vs a validator** -> hand-written type for known shapes with a single source of truth; `unknown` + narrowing for simple boundary values; a runtime schema (`zod`/`class-validator`) once the shape is non-trivial or the consequence of being wrong is silent corruption, not a crash.
- **Sequential vs. parallel awaits** -> parallelize whenever calls are truly independent in *both* data and side effects; sequential when either the data or a write-order dependency exists, even if it "looks" independent at first glance.
- **Retry policy** -> retry only idempotent operations and only on `5xx`/network failures, with exponential backoff + jitter, never a fixed delay, and always a hard cap on attempts/time.
- **Discriminated union vs. class hierarchy** -> union when variants are mostly data validated by a `switch`; classes when variants have meaningfully different behavior you'll extend with new operations over time.

### Production checklist (condensed, cross-chapter)

- [ ] `===`, not `==`, everywhere except deliberate `== null`.
- [ ] `strict: true` on in every `tsconfig.json`, no per-directory carve-outs left undocumented.
- [ ] Every external response validated at the boundary before being trusted as its declared type.
- [ ] Every async call either awaited-with-try/catch or has an explicit `.catch(logError)` - zero floating Promises (enforced via lint, not memory).
- [ ] Every network call has a timeout and, where relevant, `AbortController`-based cancellation for "latest wins" flows.
- [ ] Sensitive fields (`passwordHash`, etc.) are stripped by runtime construction/serializer, never by a compile-time `Omit<>` alone.

### Anti-patterns to call out unprompted

- Catching an error just to log and silently continue with `undefined` propagating downstream.
- Type assertions (`as X`) used to silence an error instead of proving the assertion true.
- All-optional DTO fields standing in for a real discriminated union of valid states.
- `enum` members inserted in the middle of an existing numeric enum, shifting persisted values.
- Recursive/clever type-level code where a plain, slightly duplicated type would be equally correct and far more maintainable.

### Senior follow-up Q&A (drill these out loud, 3-4 minutes each)

**SQ1. You're told "our checkout flow occasionally double-charges customers under load." Walk through how JS/TS-level knowledge from this track helps you investigate.**
> "I'd suspect a double-submit or a retry-without-idempotency issue before anything exotic. On the frontend: is the submit handler guarded against a double-click firing two overlapping `async` requests (the classic missing `isSubmitting` guard)? On the network layer: does a retry-on-timeout policy retry a charge request that actually succeeded server-side but timed out on the response (a classic 'successful failure' from chapter 2) - if so, the charge endpoint needs to be idempotent (an idempotency key) regardless of how careful the client is. I'd also check for a `Promise.all`/`forEach`-with-async bug that might be firing the charge call more than once due to a `.forEach(async ...)`-style mistake not being awaited correctly."

**SQ2. A colleague says "let's just turn off `strictNullChecks`, it's slowing us down." How do you respond, concretely, not just "it's good practice"?**
> "I'd ask what specifically is slow - usually it's a wave of errors from a recent dependency upgrade or a genuinely null-heavy legacy module, not `strictNullChecks` itself being the wrong call. Turning it off doesn't remove the null-reference risk, it just removes the compiler's ability to tell you about it before runtime - we'd be trading a compile-time error for the exact 'Cannot read properties of null/undefined' production crash this flag exists to prevent. I'd instead scope it: fix the flagged errors in the noisy module directly, or if it's truly blocking, use a per-directory `tsconfig` override for that one legacy module while keeping strict checks everywhere else, rather than a blanket regression for the whole codebase."

**SQ3. Your `useAsync` custom hook and your NestJS service both use a discriminated-union result pattern. An interviewer asks you to justify using the "same shape" across frontend and backend. What's your answer?**
> "It's the same underlying problem - representing 'this operation is pending, succeeded with data, or failed with a reason' - so using the same discriminated-union shape on both sides isn't coincidental, it's recognizing that async operation state is a cross-cutting concept independent of framework. On the frontend it drives UI branching; on the backend it drives HTTP status/response mapping instead of throwing for expected failures. Sharing the *pattern* (not necessarily literal shared code, since frontend/backend often have different concrete error types) means anyone who's learned it once recognizes it everywhere in the codebase."

**SQ4. Why is "the type system caught it" not sufficient evidence that a refactor is safe, and what else do you check?**
> "Types verify internal consistency of the code you're looking at, but they say nothing about runtime data actually matching those types (unvalidated API responses, `JSON.parse` results, `any` leaking in from an untyped library), nor about behavioral correctness (the code type-checks but computes the wrong thing). After a refactor, I still run the actual test suite, check for `any`/`unknown`/assertion boundaries the refactor touched, and for anything crossing a runtime boundary, verify with an integration test that real data still validates - 'it compiles' is necessary, not sufficient."

**SQ5. Someone proposes replacing a chain of `.then()` calls with `async/await` purely for style. What do you check before approving that PR?**
> "Mainly that error handling semantics are preserved - a `.catch()` at the end of a `.then()` chain catches errors from every step before it, and the `async/await` rewrite needs an equivalent `try/catch` wrapping the whole sequence, not per-`await` catches that change what actually gets caught where. I'd also check whether any of the original `.then()` calls were intentionally *not* awaited (fire-and-forget with its own `.catch`), since a naive rewrite can accidentally serialize previously-parallel work by awaiting things that were meant to run concurrently."

**SQ6. How would you explain, in one tight answer, why your CV's mix of "JavaScript fundamentals" and "TypeScript advanced" both matter to a role that's 90% TypeScript day-to-day?**
> "TypeScript's guarantees stop at compile time - `this` binding, closures, the event loop, and coercion are all runtime JavaScript behaviors that TypeScript's type system doesn't change or protect against; it can tell you a function's signature but not that a callback's `this` will be correctly bound at the actual call site. Advanced TypeScript (conditional/mapped types, strict mode, DTO typing) is where I get compile-time leverage, but debugging a stale closure in a `useEffect`, a `this` footgun in a passed callback, or a race condition in concurrent `await`s is pure JavaScript-runtime reasoning no type annotation fixes for you. Being strong in both is what lets me explain *why* a bug happens, not just that the compiler didn't catch it."

---
