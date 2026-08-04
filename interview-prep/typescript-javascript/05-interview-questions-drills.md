# 05 - Interview Questions & Drills

> Goal: One consolidated bank to drill from daily - rapid-fire recall, "predict the output" code snippets, deeper design questions, live-coding-style exercises, and a repeatable daily practice schedule. Use this chapter for repetition; use chapters 1-4 when you need to re-learn the "why" behind an answer.

Mark progress with `[x]` as you get each question to a confident, unaided answer.

---

## How to use this chapter

1. Cover the answer with your hand/a sticky note before reading it.
2. Answer out loud, not just in your head - interviews are verbal, and verbalizing exposes gaps silent thinking hides.
3. Time yourself: aim for under 90 seconds per rapid-fire question, 3-4 minutes for design questions.
4. For "predict the output" snippets, write down your predicted output *before* running the code.
5. If you get one wrong or hesitate badly, flag it and revisit the relevant chapter (1-4) that same day, not "eventually."

---

## Part A - Rapid-fire recall (JavaScript)

1. **What are the 8 falsy values?**
   `false, 0, -0, 0n, '', null, undefined, NaN`.

2. **`var` vs `let` vs `const` - one sentence each.**
   `var`: function-scoped, hoisted and initialized to `undefined`. `let`: block-scoped, hoisted into the TDZ, reassignable. `const`: block-scoped, hoisted into the TDZ, cannot be reassigned (but object contents remain mutable).

3. **What is the Temporal Dead Zone?**
   The period between a `let`/`const`/`class` binding being hoisted and its actual declaration line executing, during which any access throws a `ReferenceError`.

4. **Define a closure.**
   A function combined with references to the variables from its enclosing lexical scope, which remain accessible even after the outer function has returned.

5. **What are the 4 `this`-binding rules, in precedence order?**
   `new` binding > explicit binding (`call`/`apply`/`bind`) > implicit binding (method call) > default binding (bare call, `undefined` in strict mode).

6. **How do arrow functions handle `this`?**
   They have no `this` of their own - they lexically inherit `this` from the enclosing scope at definition time.

7. **Is `class` just syntactic sugar over prototypes?**
   Mostly, but with real differences: always strict mode, TDZ instead of hoisting the body, calling without `new` throws, and methods are non-enumerable by default.

8. **Why avoid `==` in favor of `===`?**
   `==` performs often-surprising implicit type coercion before comparing; `===` never coerces, making behavior predictable. The one broadly accepted exception is `value == null` to check for both `null` and `undefined` at once.

9. **Why is `NaN !== NaN`?**
   Per the IEEE-754 spec, `NaN` is defined to never equal anything, including itself. Use `Number.isNaN(x)` to test for it correctly.

10. **CommonJS vs ES Modules - two real differences.**
    CommonJS resolves `require()` dynamically at runtime and copies exported primitive values; ES Modules are statically analyzable at parse time (enabling tree-shaking) and export live bindings that update when the source variable changes.

---

## Part B - Rapid-fire recall (Async & Event Loop)

11. **What's the event loop's priority order?**
    Finish the current synchronous script -> drain the entire microtask queue (including newly added microtasks) -> run exactly one macrotask -> repeat.

12. **Microtask vs macrotask - name 2 examples of each.**
    Microtasks: `Promise.then/.catch/.finally` callbacks, `queueMicrotask`. Macrotasks: `setTimeout`/`setInterval` callbacks, I/O callbacks, `setImmediate` (Node).

13. **Does `await` block the thread?**
    No - it suspends the `async` function and returns control to the event loop; the rest of the function resumes as a microtask once the awaited Promise settles.

14. **`Promise.all` vs `Promise.allSettled` - core difference?**
    `all` rejects immediately if any input rejects (fail-fast); `allSettled` always resolves once every input has settled, giving a per-item status/value/reason.

15. **`Promise.race` vs `Promise.any`?**
    `race` settles as soon as the first input settles, whether fulfilled or rejected. `any` resolves with the first *fulfillment* and only rejects (with an `AggregateError`) if every input rejects.

16. **Why doesn't `array.forEach(async fn)` actually wait for anything?**
    `forEach` ignores the return value of its callback entirely, so the Promises returned by each `async` invocation are fired off but never awaited - the loop itself completes synchronously and immediately.

17. **How do you run two independent `await` calls in parallel instead of sequentially?**
    Start both async calls without awaiting immediately, then await them together: `const [a, b] = await Promise.all([callA(), callB()]);`.

18. **What causes a "stale response wins" race condition, and how do you fix it?**
    Two async requests can resolve out of send order; an older request's response can arrive after a newer one and overwrite it. Fix with `AbortController` cancellation of the previous request, or by tracking a request id and ignoring responses that don't match the latest one.

19. **What is an unhandled Promise rejection, and why does it matter?**
    A rejected Promise with no `.catch()` or enclosing `try/catch` around its `await`. It can fail silently, log unhelpful warnings, or in Node (depending on version/flags) crash the process - "fire and forget" async calls should always have an explicit `.catch(logError)`.

---

## Part C - Rapid-fire recall (TypeScript)

20. **Structural vs nominal typing - which does TypeScript use?**
    Structural - type compatibility is based on shape, not declared name/relationship.

21. **Do TypeScript types exist at runtime?**
    No, they're fully erased during compilation - `instanceof` against an `interface` is impossible because nothing remains at runtime to check.

22. **Name one thing `interface` can do that `type` cannot, and vice versa.**
    `interface` supports declaration merging (multiple same-name declarations combine). `type` can express unions, tuples, and mapped/conditional types, which `interface` cannot.

23. **What is a discriminated union, and why prefer it over an all-optional-fields object?**
    A union of object shapes sharing a literal "tag" property that TypeScript uses to narrow the whole shape safely; it prevents constructing invalid field combinations that an all-optional object would silently allow.

24. **Name 4 ways to narrow a TypeScript union type.**
    `typeof`, `instanceof`, the `in` operator, and a custom type predicate (`function isX(v): v is X`).

25. **What does `<K extends keyof T>` buy you in a generic function?**
    It restricts `K` to actual property names of `T`, catching typos at compile time, and lets the return type be inferred precisely via indexed access (`T[K]`).

26. **`unknown` vs `any` - core difference?**
    `any` disables type checking entirely and is contagious to anything it touches; `unknown` is type-safe - it can hold anything, but you must narrow it before use.

27. **Why are `catch` clause variables typed as `unknown` in modern TypeScript?**
    A thrown value can genuinely be any type, not just `Error`; typing it `unknown` forces a narrowing check (e.g. `instanceof Error`) before accessing any property, preventing a runtime crash if something unexpected was thrown.

28. **Runtime cost difference between `enum` and a union of string literals?**
    `enum` compiles to a real JS object shipped in the bundle; a union of string literals is fully erased at compile time with zero runtime footprint.

29. **What does `infer` do inside a conditional type?**
    It introduces a new type variable that captures part of a matched type, for reuse in the conditional's result branch - e.g. `ReturnType<F>` uses it to capture a function's return type.

30. **How is `Partial<T>` actually implemented under the hood?**
    As a mapped type: `{ [K in keyof T]?: T[K] }` - it iterates every key of `T` and adds an optional modifier.

31. **Why are NestJS DTOs written as classes rather than interfaces?**
    Validation decorators (`@IsEmail()`, etc.) need a real runtime construct to attach `reflect-metadata` to; interfaces are fully erased at compile time, so there's nothing left at runtime for a decorator to attach to.

32. **What does `strict: true` actually enable?**
    A bundle of roughly 8 individual compiler flags, most impactfully `strictNullChecks` (no silent `null`/`undefined` assignability) and `noImplicitAny` (no silently inferred `any`).

---

## Part D - "Predict the output" drills

Write down your predicted output before checking the answer.

### D1
```js
console.log('a');
setTimeout(() => console.log('b'), 0);
Promise.resolve().then(() => console.log('c'));
console.log('d');
```
**Answer:** `a, d, c, b` - sync code first, then the full microtask queue, then the macrotask.

### D2
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
**Answer:** `3, 3, 3` - `var` is function-scoped; all three closures share the same `i`, which is `3` once the loop finishes and the callbacks finally run.

### D3
```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
**Answer:** `0, 1, 2` - `let` creates a fresh binding per iteration, so each closure captures its own distinct `i`.

### D4
```js
console.log(typeof undeclaredVar);
console.log(typeof letVar);
let letVar = 1;
```
**Answer:** `"undefined"` then throws `ReferenceError` - `typeof` on a truly undeclared variable is safe, but `typeof` on a variable in the TDZ still throws.

### D5
```js
const obj = {
  name: 'nika',
  greet() { console.log(this.name); },
};
const fn = obj.greet;
fn();
```
**Answer:** Throws (or logs `undefined` in sloppy mode) - `fn` is called as a bare function, so default binding applies and `this` is `undefined` in strict mode (ES modules/class bodies are strict by default), not `obj`.

### D6
```js
console.log(1 + '1');
console.log('5' - 1);
console.log([] + []);
console.log([] + {});
```
**Answer:** `'11'`, `4`, `''`, `'[object Object]'` - `+` prefers string concatenation if either side is/becomes a string; `-` always coerces both sides to numbers.

### D7
```js
async function f() {
  console.log('1');
  await null;
  console.log('2');
}
console.log('start');
f();
console.log('end');
```
**Answer:** `start, 1, end, 2` - `f()` runs synchronously up to the first `await`, then yields control back to the caller; `console.log('end')` runs before the microtask resuming `f` after `await null`.

### D8
```js
Promise.resolve()
  .then(() => { throw new Error('boom'); })
  .then(() => console.log('never runs'))
  .catch(err => console.log('caught:', err.message));
```
**Answer:** `caught: boom` - a thrown error inside a `.then()` skips forward past subsequent `.then()`s with no rejection handler, landing at the next `.catch()`.

### D9
```ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
function process(x: unknown) {
  if (isString(x)) {
    console.log(x.toUpperCase());
  }
}
```
**Answer:** Compiles and runs fine - `isString` is a type predicate; inside the `if` block, `x` is narrowed from `unknown` to `string`, so `.toUpperCase()` is safe and type-checked.

### D10
```js
items.forEach(async (item) => {
  await save(item);
});
console.log('done');
```
**Answer:** `'done'` logs immediately, before any `save(item)` call has actually resolved - `forEach` fires all the `async` callbacks but never awaits their returned Promises.

---

## Part E - Design / deeper-dive questions

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

## Part F - Live-coding-style exercises

Do these in a real editor/REPL, out loud, narrating your reasoning as you would in an interview.

1. **Implement `debounce(fn, delay)`** using closures, so rapid calls only trigger `fn` once, `delay` ms after the last call.
2. **Implement `Function.prototype.myBind`** using `apply`/`call` and a closure over the bound arguments.
3. **Implement a `once(fn)` higher-order function** that runs `fn` at most once, caching and returning the first result on subsequent calls.
4. **Implement a concurrency-limited async batch runner**: `runLimited(tasks: (() => Promise<T>)[], limit: number): Promise<T[]>`.
5. **Implement a typed `Result<T, E>` type** (`{ ok: true, value: T } | { ok: false, error: E }`) and a `safeParseJson<T>(input: string): Result<T, Error>` function that never throws.
6. **Implement a generic `groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<K, T[]>`.**
7. **Implement a small `useAsync<T>` React hook** returning a discriminated-union state (`idle | loading | success | error`) plus a `run()` function, with race-condition protection (ignore stale responses).
8. **Write `CreateUserDto`/`UpdateUserDto`/`UserResponseDto`** for a `User` entity using utility types and `class-validator` decorators, and explain out loud why each is shaped the way it is.
9. **Implement `DeepReadonly<T>`** as a recursive mapped type, and verify it against a 2-level nested object.
10. **Reproduce and then fix a stale-response race condition** in a small search-as-you-type function using `AbortController`.

---

## Daily drill plan

A repeatable structure for the run-up to interviews. Adjust chapter numbers to whichever you're weakest on.

### Standard day (45-60 min)
1. **(10 min)** Rapid-fire Parts A-C: pick 15 questions at random, answer out loud, no notes.
2. **(15 min)** Predict-the-output Part D: pick 4 snippets you haven't done in 3+ days, write predictions before checking.
3. **(15 min)** One Part E design question, answered out loud in full, timed to 4 minutes max.
4. **(15-20 min)** One Part F live-coding exercise, done in an actual file, not just imagined.

### Light day (20-25 min, day before an interview)
1. Skim the mastery checklists at the end of chapters 1-4; mentally flag any unchecked items.
2. Rapid-fire 10 questions from Parts A-C, out loud.
3. Re-read the green/red flags sections in chapters 1-4 once, closely.

### Post-mock-interview day
1. Write down every question you hesitated on or got wrong, verbatim if possible.
2. Trace each one back to its source chapter and re-read that section fully.
3. Add any genuinely new question you were asked (that isn't already here) to this file for next time.

---

## Weak-spot tracker

Use this space (edit freely) to log recurring gaps as you drill, so review time targets real weaknesses instead of everything equally.

- [ ] (example) Kept mixing up `Promise.race` vs `Promise.any` - re-review chapter 2, section 3.
- [ ] (example) Forgot `strictPropertyInitialization` exists - re-review chapter 4, section 6.
- [ ]
- [ ]
- [ ]

---

## Senior-Level Best Practices

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

## Final pre-interview checklist

- [ ] I can answer all 32 rapid-fire questions (Parts A-C) in under 90 seconds each, unaided.
- [ ] I got all 10 predict-the-output drills (Part D) right on my most recent attempt.
- [ ] I can answer at least 5 of the 7 design questions (Part E) fluently, out loud, in under 4 minutes each.
- [ ] I've completed at least 6 of the 10 live-coding exercises (Part F) in an actual editor, not just in my head.
- [ ] I've re-read the green/red flags sections in chapters 1-4 within the last 2 days.
- [ ] My weak-spot tracker above has zero unresolved items older than 3 days.
