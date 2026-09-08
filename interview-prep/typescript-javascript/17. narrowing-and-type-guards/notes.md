# Narrowing and Type Guards

## What you need to know

**Narrowing** is TypeScript refining a wide type (often a union) to a smaller type by analyzing **control flow**: `if`, `switch`, early `return`, etc.

A **type guard** is a check that causes that refinement — built-in (`typeof`, `instanceof`, `in`, equality, truthiness) or custom (`value is T`, `asserts …`).

This unit connects [discriminated unions](../16.%20unions-intersections-discriminated/notes.md) (tag checks) to the full toolkit, and [erasure](../14.%20typescript-structural-erased/notes.md) (guards are real runtime JS; types follow them).

Curriculum checklist:

- `typeof`, `instanceof`, `in`
- Truthiness and equality narrowing
- Custom type predicates (`v is X`)
- Assertion functions (`asserts`)
- Control-flow analysis (including early returns)

---

## Control-flow analysis (mental model)

TypeScript walks your function like a human reader:

1. At each check, eliminate impossible constituents of a union.
2. Inside a branch, use the narrowed type.
3. After a branch that **returns/throws**, treat that case as handled for the rest of the function.
4. Assignments can **reset** narrowing if you reassign a variable to a wider value.

```ts
function process(value: string | number | Date | null) {
  if (value === null) return; // equality — null gone afterward
  if (typeof value === 'string') {
    /* string */
  } else if (typeof value === 'number') {
    /* number */
  } else if (value instanceof Date) {
    /* Date */
  }
}
```

Narrowing is **compile-time reasoning about runtime checks**. Wrong guards (lying predicates) produce unsound types.

---

## `typeof` narrowing (primitives)

### What it does

Discriminates JS typeof tags:

`'string' | 'number' | 'boolean' | 'undefined' | 'object' | 'function' | 'symbol' | 'bigint'`

```ts
function len(x: string | number) {
  if (typeof x === 'string') return x.length;
  return x.toFixed(2);
}
```

### Trap: `typeof null === 'object'` (preserved interview answer)

> Long-standing JS quirk that can’t be fixed without breaking the web. `typeof value === 'object'` is also true for `null`, so treating “object” as “safe to read properties” throws on `null`. Always check `value === null` (or `value == null` for nullish) before/alongside object `typeof` chains. After an explicit null check, TS excludes `null` from later branches.

```ts
function keys(value: object | null) {
  if (value === null) return [];
  // value is object here
  return Object.keys(value);
}
```

### Arrays and plain objects

`typeof [] === 'object'` — use `Array.isArray` to narrow arrays:

```ts
function f(x: string | string[]) {
  if (Array.isArray(x)) return x.join(',');
  return x.toUpperCase();
}
```

---

## `instanceof` narrowing (classes / constructors)

Works with **runtime** constructor values (classes, some built-ins):

```ts
function when(d: Date | string) {
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}
```

Does **not** work with interfaces/type aliases (erased). Cross-realm issues (iframe `Date`) can make `instanceof` false for “looks like Date” values — rare but real in browsers.

---

## `in` operator narrowing

Checks property existence; narrows unions when one side has the key:

```ts
type Admin = { role: 'admin'; permissions: string[] };
type Guest = { role: 'guest' };

function describe(user: Admin | Guest) {
  if ('permissions' in user) {
    console.log(user.permissions); // Admin
  }
}
```

Caveats:

- Optional properties and prototype-chain keys can surprise you (`in` is true for inherited keys).
- Prefer a discriminant field when you design the type yourself.
- For “own property only,” combine with careful checks or different modeling.

---

## Truthiness narrowing

```ts
function f(x: string | null | undefined) {
  if (x) {
    // string (empty string excluded!)
    x.toUpperCase();
  }
}
```

**Gotcha:** `''`, `0`, `NaN`, `false` are falsy. Truthiness narrowing removes them along with nullish — bad when empty string / zero are valid.

Prefer `x != null` / `x !== undefined && x !== null` when only nullish should be excluded.

---

## Equality narrowing

```ts
if (x === null) { /* … */ }
if (x === 'foo') { /* literal narrowing */ }
if (state.status === 'success') { /* discriminant — previous unit */ }
```

`switch` on discriminants is equality narrowing at scale.

`== null` catches both `null` and `undefined` (loose equality) — intentional nullish check.

---

## Custom type predicates (`value is T`)

### What they are

A return type that says: **if the function returns `true`, the argument is type `T` in the caller’s control flow.**

```ts
interface Cat {
  meow(): void;
}
interface Dog {
  bark(): void;
}

function isCat(animal: Cat | Dog): animal is Cat {
  return 'meow' in animal; // better than casting blindly when possible
}

function speak(animal: Cat | Dog) {
  if (isCat(animal)) animal.meow();
  else animal.bark();
}
```

### Why they matter

Built-ins aren’t enough for:

- API JSON shape validation
- Nested discriminants
- Branded types
- Library-specific structures

### Responsibility

The **body must be honest**. A predicate that always returns `true` unsounds the program — TS trusts you.

```ts
function isUser(v: unknown): v is { id: string } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'id' in v &&
    typeof (v as { id: unknown }).id === 'string'
  );
}
```

Often paired with `unknown` at boundaries (later `unknown` vs `any` unit).

---

## Assertion functions (`asserts`)

### What they are

Functions that **throw** if a condition fails, and tell TypeScript that after a successful call, some condition holds.

```ts
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg ?? 'Assertion failed');
}

function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error('not a string');
}

function f(x: unknown) {
  assertIsString(x);
  x.toUpperCase(); // string
}
```

### Predicate vs assertion

| | Type predicate `is T` | Assertion `asserts x is T` |
|---|---|---|
| Returns | boolean | `void` (throws on failure) |
| Caller style | `if (isX(v)) { … }` | `assertIsX(v);` then use `v` |
| Failure | `false` branch | exception |

Use assertions for “must be true or abort” (Nest guards-ish style in plain TS, invariant checks).

---

## Early returns and mutually exclusive branches

```ts
function handle(x: string | number) {
  if (typeof x === 'string') {
    return x.toUpperCase();
  }
  // x is number here — string returned already
  return x.toFixed(2);
}
```

TS treats returned/thrown paths as eliminating those cases from later code — same idea as exhaustiveness in switches.

---

## Aliasing and narrowing pitfalls (important edge)

```ts
function f(obj: { a: string | number }) {
  if (typeof obj.a === 'string') {
    // ok: obj.a is string here in simple cases
  }
}
```

Destructuring / storing in a new variable can interact with narrowing differently than property access; reassignment widens again:

```ts
let x: string | number = 'a';
if (typeof x === 'string') {
  x = 1; // now number again
}
```

For props that might change (mutable objects), narrowing a property is not a lifetime guarantee if something else mutates — prefer local `const` copies after checks when needed.

---

## Common mistakes and misconceptions

1. **`typeof null === 'object'`** forgotten in object branches.
2. **Truthiness** wiping out valid `''` / `0`.
3. **`instanceof` on interfaces.**
4. **Lying type predicates** (`return true`).
5. Expecting `typeof` to distinguish class instances (usually `'object'`).
6. Using `in` when a discriminant would be clearer / safer.
7. Confusing **type assertions** (`x as T`) with **assertion functions** / predicates — `as` forces a type without a runtime check.

---

## Connections to other concepts

```
runtime check (JS)
  → control-flow analysis (TS)
    → narrowed static type

discriminated union tag check
  → equality narrowing special case

erasure
  → interfaces need predicates, not instanceof

unknown at boundaries
  → predicates / asserts / zod to enter typed world

never / exhaustiveness
  → leftover after narrowing all cases
```

---

## Interview perspective

You should be able to:

1. List the built-in narrowing tools and when each applies.
2. Explain the `typeof null` trap and your null-check habit.
3. Write a type predicate signature and say what it means.
4. Contrast predicates vs `asserts` vs `as` casts.
5. Walk CFA through an early-return example.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
