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

# Self-test

## Core recall

1. What does `any` do to type checking for a value?
2. What must you do before using an `unknown` value’s properties/methods?
3. Is `any` assignable to `string` without narrowing? Is `unknown`?
4. Name three ways `any` commonly enters a codebase.
5. What does `JSON.parse` typically return, and what’s the safer immediate type?
6. Why type `catch` variables as `unknown`?
7. What is meant by `any` being “contagious”?
8. Does `unknown` prevent you from *passing* the value around before narrowing?

## Explain why

1. Why can `a.foo.bar` compile with `a: any` but crash at runtime?
2. Why doesn’t `unknown` allow the same?
3. Why is casting `JSON.parse(s) as User` still risky?
4. Why is `noImplicitAny` important?
5. Why is error handling a particularly good place for `unknown`?
6. Why can one `any` parameter poison a whole module’s inferred types?

## Compare and contrast

1. `any` vs `unknown`
2. `unknown` vs `object`
3. Narrowing `unknown` vs asserting `as T`
4. `catch (e: unknown)` vs `catch (e: any)`
5. `any` vs generics for “works with many types”
6. Validating with zod vs `as User` after parse

## Predict the output / checker result

Compile error or OK? Explain why.

1.
```ts
const u: unknown = 'x';
u.toUpperCase();
```

2.
```ts
const a: any = 'x';
a.toUpperCase();
a.nope();
```

3.
```ts
const u: unknown = 'x';
const s: string = u;
```

4.
```ts
const a: any = 'x';
const s: string = a;
```

5.
```ts
function f(x: unknown) {
  if (typeof x === 'number') return x.toFixed(1);
}
```

6.
```ts
try {
  throw 'boom';
} catch (err) {
  console.log(err.message); // assume useUnknownInCatchVariables
}
```

## Debugging

1. Diagnose:
```ts
const user = JSON.parse(body);
console.log(user.email.toLowerCase());
```

2. Diagnose contagion:
```ts
function getConfig(raw: any) {
  return raw.settings;
}
const port = getConfig(load()).port;
```

3. Diagnose:
```ts
catch (e) {
  res.status(500).send(e.message);
}
```

4. Team disabled `noImplicitAny` because “callbacks are annoying.” What regresses?

## Application

1. Rewrite a helper `function parseUser(json: string): User` using `unknown` + a type predicate (sketch).

2. Write a `toErrorMessage(err: unknown): string` that handles `Error`, string, and fallback.

3. Wrap an untyped library function `legacyGet(): any` behind `function safeGet(): unknown` and show the call-site narrowing.

4. Given `zod` conceptually, sketch `UserSchema.parse(JSON.parse(s))` vs `JSON.parse(s) as User`.

## Interview questions

1. Why does modern TypeScript prefer `unknown` for `catch` variables instead of `any`?  
   **Follow-ups:** What can be thrown in JS? How do you narrow?

2. Where does `any` sneak in even when people try to avoid it?  
   **Follow-ups:** What do you do about `JSON.parse`?

3. What’s the difference between `any` and `unknown`?  
   **Follow-ups:** Contagion? Assignability?

4. When, if ever, is `any` acceptable?

5. How do `unknown` and runtime validation relate to type erasure?

## Connections

1. How does this unit depend on the narrowing toolkit?
2. How does erasure make `unknown` at boundaries necessary for JSON/HTTP?
3. How do generics offer a better alternative than `any` for reusable functions?
4. How does Nest/zod fit the `unknown → validated T` pipeline?
5. What’s the difference between this “top type” discussion and union modeling of *known* alternatives?
