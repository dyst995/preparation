# `unknown` vs `any`

## What you need to know

Both `any` and `unknown` mean “this value could be anything.” The difference is **discipline**:

- **`any`** — opt out of checking; operations are allowed; the unsafety **spreads**.
- **`unknown`** — still “I don’t know”; you **must narrow** (or assert) before use.

Use `unknown` at **boundaries** (JSON, catch, untyped APIs). Treat `any` as a last resort or temporary escape hatch.

Prerequisites: [Narrowing](../17.%20narrowing-and-type-guards/notes.md), [Erasure](../14.%20typescript-structural-erased/notes.md).

Curriculum checklist:

- `any` disables checking and is contagious
- `unknown` requires narrowing before use
- Silent entry points for `any`
- Correct `unknown` at catch / JSON / external APIs

---

## The core difference (preserved)

```ts
let a: any = 'hello';
a.toUpperCase(); // ok
a.nonExistentMethod(); // ok at compile time — will fail at runtime
a = 5;
a.foo.bar.baz; // ok for the checker — crash waiting to happen

let u: unknown = 'hello';
u.toUpperCase(); // Error — must narrow

if (typeof u === 'string') {
  u.toUpperCase(); // ok
}
```

**Mental model:**

| | `any` | `unknown` |
|---|---|---|
| Assign **to** it | Almost anything | Almost anything |
| Assign **from** it to a precise type | Allowed without checks | Error unless narrowed/asserted |
| Call methods / property access | Allowed | Error until narrowed |
| Spreads unsafety | Yes — contagious | No — forces proofs |

Anything that **touches** `any` often becomes `any` too (return values, inferred locals), so one `any` can disable large regions of the program.

```ts
function f(x: any) {
  return x.foo; // return type any
}
const y = f(1);
y.bar; // still any — no error
```

`unknown` does not assign freely to `string` / `User` / etc.:

```ts
function g(x: unknown) {
  // const s: string = x; // Error
  if (typeof x === 'string') {
    const s: string = x; // ok
  }
}
```

---

## Assignability (interview detail)

- **Top type (roughly):** both can receive any value.
- **`any` is also a bottom-ish escape:** it is assignable *to* most types without proof (unsound by design).
- **`unknown` is not assignable to other types** without narrowing or assertion.

That’s why `unknown` preserves safety and `any` does not.

---

## Where `any` sneaks in (preserved + expanded)

### 1. Implicit `any`

With `noImplicitAny` off (or weak inference), parameters become `any`:

```ts
// noImplicitAny: false
function add(a, b) {
  return a + b; // a, b: any
}
```

**Fix:** enable `strict` / `noImplicitAny`; annotate or use contextual typing.

### 2. Untyped / poorly typed libraries

Modules without types default to `any` exports (depending on `noImplicitAny` / `skipLibCheck` / allowJs settings). Missing `@types/…` is a classic infection source.

**Fix:** add types, write a minimal `.d.ts`, or wrap the API behind a typed facade that takes `unknown` and validates.

### 3. `JSON.parse`

```ts
JSON.parse(s); // any (historically / typically)
```

**Fix pattern:**

```ts
const data: unknown = JSON.parse(s);
if (isUser(data)) {
  /* data is User */
}
// or zod: UserSchema.parse(JSON.parse(s))
```

Prefer **validate** over `as User` right after parse.

### 4. Other common leaks

- `as any` / `// @ts-ignore` to silence errors  
- `Object.keys` / some DOM APIs returning wide types (less extreme than `any`, but similar “widen then cast” habits)  
- Generic defaults written as `T = any`  
- Test mocks typed loosely  

---

## Correct uses of `unknown`

### `catch` variables (preserved interview answer)

Modern TS (`useUnknownInCatchVariables` / strict-ish defaults): `catch (err)` → `unknown`.

> Thrown values can be anything — not only `Error`. `any` would allow `err.message` even when `err` is a string. `unknown` forces `instanceof Error` (or similar) before property access — the right discipline for the most “anything can show up” path.

```ts
try {
  await doWork();
} catch (err) {
  if (err instanceof Error) console.error(err.message);
  else console.error(String(err));
}
```

### External API / `JSON.parse` / message ports

Boundary in: `unknown` → narrow/validate → typed domain.  
Boundary out: serialize known types; don’t trust round-trips without parsing.

### Generic “passthrough until inspected”

```ts
function logValue(v: unknown) {
  console.log(v); // ok — logging doesn't require structure
}
```

You can pass `unknown` around; you cannot *operate* on it as structured data without checks.

---

## When people still use `any` (honest nuance)

Rare, conscious cases:

- Migrating a huge JS file (temporary)  
- Truly unrepresentable interop (then wrap and shrink the blast radius)  
- Exhausted type system edge cases (document why; prefer `unknown` + assert)

**Never** as the default for “I’ll fix types later” in new Nest/React code.

Prefer:

1. `unknown` + narrowing  
2. Generics  
3. Proper typings  
4. `any` only with a comment and a ticket to remove it  

---

## Assertions vs narrowing

```ts
const u: unknown = JSON.parse(s);
const user = u as User; // compiles — no runtime proof
```

Assertions are sometimes needed; they are not safer than `any` if you assert wrongly. Prefer predicates / zod, then assertion only at a validated boundary.

---

## Common mistakes and misconceptions

1. “`unknown` is the same as `any`.” — Same “could be anything,” opposite checking rules.  
2. Casting `JSON.parse` straight to `User`.  
3. `catch (e: any)` out of habit.  
4. Disabling `noImplicitAny` to “save time.”  
5. One `any` in a helper poisoning an entire feature.  
6. Using `Object` / `{}` when you meant `unknown` (different assignability quirks — prefer `unknown` for “yet unvalidated”).  

---

## Connections to other concepts

```
untrusted input
  → unknown
    → typeof / instanceof / predicates / zod
      → typed value

any
  → skips checking
    → infects dependents
      → runtime crashes with no compile signal

erasure
  → types don't validate JSON
    → unknown forces the validation step you actually need

strict / noImplicitAny
  → blocks silent any
```

---

## Interview perspective

You should be able to:

1. Contrast `any` vs `unknown` with a crashing `any` example.  
2. Explain contagion.  
3. Defend `unknown` in `catch` and after `JSON.parse`.  
4. List sneaky `any` sources and mitigations.  
5. Prefer narrowing over blind `as`.

One-liner:

> `any` means “trust me, don’t check”; `unknown` means “prove it before you use it.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
