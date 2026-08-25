# Strict Mode, Unpacked

## What you need to know

`strict: true` in `tsconfig` is **not one check**. It turns on a **bundle** of individual compiler flags. Interviews want you to name the bundle, unpack the important ones, and argue which matter most in production.

Highest impact in practice:

1. **`strictNullChecks`** — null/undefined aren’t assignable everywhere  
2. **`noImplicitAny`** — untyped params don’t silently become `any`

Also in the bundle: `strictFunctionTypes`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`, `noImplicitThis`, `strictBindCallApply`.

Prerequisites: [unknown vs any](../20.%20unknown-vs-any/notes.md), [narrowing](../17.%20narrowing-and-type-guards/notes.md), Nest class patterns for definite assignment.

---

## `strict: true` is a shortcut

Enabling `strict` turns on roughly these flags (TS 4.4+ includes catch-as-unknown in the bundle):

| Flag | One-line effect |
| --- | --- |
| `strictNullChecks` | `null` / `undefined` only where allowed |
| `noImplicitAny` | no inferred `any` on untyped params/vars that would otherwise be `any` |
| `strictFunctionTypes` | stricter function parameter checking (contravariance for comparisons) |
| `strictPropertyInitialization` | class fields initialized or typed `| undefined` / `!` |
| `useUnknownInCatchVariables` | `catch (e)` → `e: unknown` |
| `alwaysStrict` | emit `"use strict"` / parse in strict mode |
| `noImplicitThis` | error when `this` would be implicitly `any` |
| `strictBindCallApply` | type-check `bind` / `call` / `apply` arguments |

You can enable `strict` and **turn one flag off** explicitly if migrating a codebase (`"strictNullChecks": false` under `"strict": true` — possible but discouraged long-term).

---

## `strictNullChecks` (highest impact)

Without it, `null` and `undefined` are assignable to **almost every type**. `string` secretly means `string | null | undefined` in practice — the type system stops protecting you from the most common JS crash: reading a property of null/undefined.

```ts
// without strictNullChecks
function getLength(s: string) {
  return s.length;
}
getLength(null); // compiles, crashes at runtime

// with strictNullChecks
getLength(null); // error: null not assignable to string

function getLengthSafe(s: string | null) {
  if (s === null) return 0;
  return s.length; // narrowed to string
}
```

### Practical consequences

- APIs must say `string | null` when null is possible.  
- You narrow before use (`if`, `??`, optional chaining with care).  
- Optional properties (`prop?: T`) already involve `undefined` under strict null checks.

This is why Nest/React code under strict is full of `| null`, guards, and definite assignment patterns — not ceremony, but modeling reality.

---

## `noImplicitAny`

```ts
// noImplicitAny off
function log(x) {
  // x is implicitly any — checking largely off for x
}

// noImplicitAny on
function log(x) {
  // error: Parameter 'x' implicitly has an 'any' type
}
function log(x: string) {
  /* ok */
}
```

**Why it matters:** `any` infects call sites. One untyped callback parameter can disable checking through a whole chain. `noImplicitAny` forces annotations (or inference from context) so `any` is an **explicit** choice.

Context typing still works: `.map((n) => n + 1)` on `number[]` can infer `n` without an annotation.

---

## `strictFunctionTypes`

Compares function types more strictly, especially **parameter** positions (contravariance): a function that accepts only `Dog` is **not** safely usable where a function that accepts `Animal` is required (you might pass a `Cat`).

```ts
type Handler = (value: string | number) => void;

const stringOnly = (value: string) => {};
// Under strictFunctionTypes, assigning stringOnly to Handler is an error:
// Handler may call with a number.
```

Methods on objects historically had looser (bivariant) checking in some cases; the flag’s day-to-day interview point: **callback parameter types aren’t “anything goes.”** Unsafe assignments that used to slip through get caught.

You don’t need full variance theory — know **why** a narrower-parameter function isn’t a subtype of a wider-parameter function type.

---

## `strictPropertyInitialization`

Class properties must be initialized in the declaration or constructor (or be optional / `| undefined`), unless you use a definite assignment assertion.

```ts
class UserService {
  private users: User[]; // error: not initialized

  constructor(private readonly repo: UserRepository) {}
  // parameter properties ARE initialized — fine
}
```

### Nest-flavored fixes (preserved)

```ts
private users: User[] = [];           // default
private users!: User[];               // definite assignment — sparingly
constructor(private readonly repo: UserRepository) {} // DI param property
```

Use `!` only when something else definitely assigns before read (framework DI, `ngOnInit`-style lifecycle you control). Abuse of `!` reintroduces null crashes under a lie to the compiler.

---

## `useUnknownInCatchVariables`

```ts
try {
  await doWork();
} catch (e) {
  // e: unknown under this flag (and under strict in modern TS)
  // not e: any
}
```

Forces narrowing/`instanceof Error` / type guards before use — same story as preferring `unknown` over `any` for untrusted values. Recap from unknown-vs-any unit.

---

## Lower-profile flags in the bundle

### `alwaysStrict`

Emit/parse with JS **strict mode** (`"use strict"`). Catches sloppy-mode footguns (accidental globals, etc.) at runtime semantics level. Less “TS type” than “JS mode,” but part of the bundle.

### `noImplicitThis`

```ts
const obj = {
  n: 1,
  // broken extraction:
};
function orphan() {
  console.log(this.n); // error under noImplicitThis: this is implicitly any
}
```

If `this` isn’t typed by a class/interface/`this` parameter, TS errors instead of treating `this` as `any`.

### `strictBindCallApply`

```ts
function greet(name: string) {}
greet.call(undefined, 123); // error under the flag — arg types checked
```

`bind` / `call` / `apply` must match the function’s parameter types instead of accepting anything.

---

## Mental model: what “strict” buys you

```
strictNullChecks     → null crashes become type errors
noImplicitAny        → silent any holes closed
strictPropertyInit   → half-built class instances caught
useUnknownInCatch    → catch isn't a free any
strictFunctionTypes  → unsafe callback assignment caught
noImplicitThis       → floating this isn't any
strictBindCallApply  → call/apply args checked
alwaysStrict         → JS strict mode emit/parse
```

Migrating a non-strict app: turn on `strict`, fix `strictNullChecks` / `noImplicitAny` first — largest bug surface.

---

## Common mistakes and misconceptions

1. Thinking `strict: true` is a single mysterious mode with no parts.  
2. Disabling `strictNullChecks` “to ship faster” and losing most TS value.  
3. Spamming `!` on every Nest property instead of defaults / constructor init.  
4. Confusing `strict` (TS) with JS `"use strict"` alone — related via `alwaysStrict`, not identical.  
5. Assuming `noImplicitAny` bans all `any` — explicit `any` still allowed (use sparingly).  
6. Believing optional chaining replaces modeling `| null` in APIs.

---

## Connections to other concepts

```
strictNullChecks
  → unions with null + narrowing
    → optional chaining / ?? as tools after types tell truth

noImplicitAny / useUnknownInCatch
  → unknown-vs-any discipline

strictPropertyInitialization
  → Nest DI parameter properties / !

strictFunctionTypes
  → callback props in React, event handlers
```

---

## Interview perspective

**Q: What does `strict: true` do, and which flag matters most?**

Preserved strong answer:

> `strict` enables ~eight flags at once (`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`, `noImplicitThis`, `strictBindCallApply`). **`strictNullChecks`** has the biggest real-world impact — without it null/undefined are silently assignable everywhere, defeating protection against null-reference crashes. **`noImplicitAny`** is a close second — stops untyped parameters from becoming implicit `any` and disabling checking.

Also be ready: Nest `strictPropertyInitialization` patterns (`= []`, `!`, constructor param properties).

---

# Self-test

## Core recall

1. Is `strict: true` one check or a bundle?
2. Name the major flags `strict` turns on.
3. What does `strictNullChecks` change about `null`/`undefined`?
4. What does `noImplicitAny` forbid?
5. What does `strictPropertyInitialization` require of class fields?
6. How is `catch (e)` typed with `useUnknownInCatchVariables`?
7. What do `noImplicitThis` and `strictBindCallApply` roughly guard?
8. Which two flags are usually called out as highest real-world impact?

## Explain why

1. Why is `strictNullChecks` often called the highest-impact flag?
2. Why does TS widen/`any`-hole untyped parameters without `noImplicitAny` matter?
3. Why does `getLength(null)` compile without `strictNullChecks` but crash at runtime?
4. Why use constructor parameter properties in Nest under `strictPropertyInitialization`?
5. Why should `!` definite assignment be used sparingly?
6. Why type catch as `unknown` instead of `any`?

## Compare and contrast

1. `strict: true` vs JS `"use strict"`  
2. `strictNullChecks` off vs on for `let s: string = null`  
3. Implicit `any` vs explicit `any` under `noImplicitAny`  
4. `users: User[] = []` vs `users!: User[]`  
5. `strictFunctionTypes` concern vs `strictNullChecks` concern  
6. `useUnknownInCatchVariables` vs annotating every catch yourself without the flag  

## Predict compile vs runtime

1.
```ts
// strictNullChecks on
function f(s: string) {
  return s.length;
}
f(null);
```

2.
```ts
// noImplicitAny on
function f(x) {
  return x;
}
```

3.
```ts
// strictPropertyInitialization on
class A {
  x: number;
}
```

4.
```ts
// useUnknownInCatchVariables on
try {
} catch (e) {
  console.log(e.message);
}
```

5.
```ts
class Svc {
  constructor(private readonly repo: Repo) {}
}
// Is `repo` OK under strictPropertyInitialization? Why?
```

## Debugging

1. Legacy project: `strict` on causes thousands of null errors. What’s the migration mindset?

2. Nest service: `private client: ApiClient` errors “not initialized.” Fixes?

3. Callback assigned to a wider handler type breaks only after enabling `strictFunctionTypes`. What class of bug did you catch?

4. `this` in a detached method is implicitly `any` until `noImplicitThis`. What’s the design fix?

5. Team wants “strict but not null checks.” What do you argue?

## Application

1. Rewrite `getLength` to accept `string | null` safely under `strictNullChecks`.

2. Annotate a function parameter that failed `noImplicitAny`.

3. Fix a class field under `strictPropertyInitialization` three ways (default, `!`, constructor).

4. Write a `catch` block that handles `unknown` safely (Error vs other).

5. Show a `tsconfig` snippet with `"strict": true`.

## Interview questions

1. What does `strict: true` actually do, and which flag matters most?  
   **Follow-ups:** Second place? Nest property init?

2. Explain `strictNullChecks` with a before/after example.

3. What is `noImplicitAny` and why do teams enable it?

4. How does `strictPropertyInitialization` show up in Nest/DI code?

5. What does `useUnknownInCatchVariables` change in day-to-day code?

## Connections

1. How does `strictNullChecks` force the narrowing unit’s techniques?
2. How does `noImplicitAny` / catch-`unknown` reinforce the unknown-vs-any unit?
3. How does Nest DTO/DI code interact with `strictPropertyInitialization`?
4. Why doesn’t `strict` replace runtime validation at HTTP boundaries?
5. How might React `useState`/`props` optional fields interact with null checks?
