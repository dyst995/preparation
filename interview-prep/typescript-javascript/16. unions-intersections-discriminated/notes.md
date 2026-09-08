# Unions, Intersections, and Discriminated Unions

## What you need to know

**Unions** (`|`) mean “one of these.” **Intersections** (`&`) mean “all of these at once.” **Discriminated unions** tag each variant with a shared literal field so TypeScript can **narrow** the whole object safely.

This is the most important modeling pattern in day-to-day TypeScript for async UI state, API results, and domain events.

Curriculum checklist this unit completes:

- Union (`|`) vs intersection (`&`)
- Literal types as discriminants
- Discriminated (tagged) unions + narrowing
- Exhaustiveness checking with `never`

Related: [type vs interface](../15.%20type-vs-interface/notes.md) (unions need `type`), narrowing tools expand further in a later core section.

---

## Unions (`|`)

### What it is

A value of type `A | B` is **either** an `A` **or** a `B` (or both if a value happens to satisfy both — rare for primitives).

```ts
type StringOrNumber = string | number;

function pad(x: StringOrNumber) {
  // x.toFixed() // Error — not on string
  return String(x);
}
```

### How access works

On a union of objects, you may only access members that exist on **every** constituent — until you narrow:

```ts
type Cat = { meow: () => void };
type Dog = { bark: () => void };

function speak(a: Cat | Dog) {
  // a.meow() // Error
  if ('meow' in a) a.meow();
  else a.bark();
}
```

### Why unions matter

They model real alternatives without lying with optionals (`data?:` + `error?:` on one blob).

---

## Intersections (`&`)

### What it is

A value of type `A & B` must satisfy **both** `A` and `B`.

```ts
type NameAndAge = { name: string } & { age: number };
// effectively { name: string; age: number }
```

### Common trap: incompatible primitives → `never`

```ts
type Impossible = string & number; // never
```

No runtime value is both. Intersecting object types with the **same property name** but incompatible property types also tends toward `never` for that property.

### When to use intersections

- Compose object capabilities: `Writable & Timestamped`
- Mix in cross-cutting fields
- Not a substitute for “or” — that’s a union

---

## Literal types

### What they are

Types that admit only specific primitive values:

```ts
type Status = 'loading' | 'success' | 'error';
type Dice = 1 | 2 | 3 | 4 | 5 | 6;
type Bit = 0 | 1;
```

String/number/boolean literals are the usual **tags** for discriminated unions.

```ts
const s = 'success'; // type might widen to string without `as const` / annotation
const t: 'success' = 'success'; // literal type
```

`as const` on objects freezes literal inference for fields — useful when building tagged values.

---

## Discriminated unions (tagged unions)

### What they are

A union of object types that share one property — the **discriminant** — with **distinct literal types** per variant.

```ts
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: User };
type ErrorState = { status: 'error'; error: string };

type FetchState = LoadingState | SuccessState | ErrorState;
```

### How narrowing works

When you check the discriminant (`switch` / `if`), TypeScript **eliminates** other variants. Properties unique to the remaining variant become available — no cast.

```ts
function render(state: FetchState) {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.name; // SuccessState
    case 'error':
      return state.error; // ErrorState
  }
}
```

### Why this beats optional-field bags (preserved interview answer)

> With `{ status: string; data?: User; error?: string }`, invalid combos like `{ status: 'success', error: 'oops' }` are still typeable — the type doesn’t encode valid combinations. With a discriminated union, each variant only carries fields that belong together; construction and reads are enforced, and exhaustiveness with `never` catches missed cases when the union grows.

### Design rules that make discriminants work

1. **Shared name** for the tag (`status`, `type`, `kind`, `tag`).
2. **Literal** (or other unit) types that don’t overlap across variants.
3. Prefer **required** tag fields (optional tags weaken narrowing).
4. Keep variants’ exclusive data on the right branches only.

Non-examples that fail as clean discriminants:

- `status: string` (not literal — no useful narrowing)
- Same literal on two variants
- Tag missing on some members

---

## Exhaustiveness checking with `never`

### Pattern (preserved)

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function render(state: FetchState) {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.name;
    case 'error':
      return state.error;
    default:
      return assertNever(state);
  }
}
```

If `FetchState` later includes `{ status: 'cancelled' }` and you forget a `case`, `state` in `default` is that leftover variant — **not** `never` — so `assertNever(state)` fails to compile.

### Why `never`?

`never` is the bottom type: no value should exist there. Assigning something to `never` is only legal if the checker proves the code is unreachable / fully handled.

### Without `default`

A `switch` that returns in every known case may still not error when a new union member is added, depending on control-flow and return types. **`assertNever` in `default`** is the reliable “fail compile on new variant” technique.

---

## Narrowing beyond `switch` (brief)

Same discriminant idea with `if`:

```ts
if (state.status === 'success') {
  state.data; // ok
}
```

Other narrowing (`typeof`, `in`, predicates) appears in depth in the narrowing unit; discriminants are the object-oriented form of the same idea.

---

## Unions of functions / call signatures (awareness)

Union of function types is callable with args common to all; return type becomes a union. Intersection of functions behaves differently (overloads-like). Enough awareness: don’t casually intersect call signatures without reading the errors — prefer explicit overloads or discriminated args.

---

## Common mistakes and misconceptions

1. **Using `|` when you meant `&`** (or reverse) — “or” vs “and.”
2. **Optional-field state objects** instead of tagged unions.
3. **Discriminant typed as `string`** — no literal narrowing.
4. **Accessing variant-only fields without narrowing.**
5. **Intersecting conflicting primitives** and being surprised by `never`.
6. **Assuming a `switch` is exhaustive** without `never` / `assertNever`.
7. **Overlapping tag literals** across variants.

---

## Connections to other concepts

```
alternatives in the domain
  → union type
    → literal tag per variant
      → discriminated union
        → narrow on tag
          → assertNever for exhaustiveness

intersection
  → combine requirements
    → conflict → never

type alias (not interface)
  → names the union

control-flow narrowing (next units)
  → generalizes beyond tags (typeof, in, predicates)
```

---

## Interview perspective

You should be able to:

1. Define `|` vs `&` with a one-line example each.
2. Build a three-state async `FetchState` and narrow on `status`.
3. Explain why tagged unions beat optional bags.
4. Show `assertNever` and what breaks when a variant is added.
5. Call out the `string & number → never` trap.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
