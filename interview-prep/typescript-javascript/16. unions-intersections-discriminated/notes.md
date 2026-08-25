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

# Self-test

## Core recall

1. What does `A | B` mean? What does `A & B` mean?
2. What is a literal type? Give an example.
3. What is a discriminated union?
4. What is a discriminant (tag)?
5. On a union of objects, which properties can you access before narrowing?
6. What does `string & number` evaluate to, and why?
7. What is the role of `never` in exhaustiveness checking?
8. Why are discriminated unions usually declared with `type`, not `interface`?

## Explain why

1. Why can’t you read `state.data` on `FetchState` without checking `status` first?
2. Why is `{ status: string; data?: User; error?: string }` a weaker model than a tagged union?
3. Why does `assertNever(state)` in `default` fail to compile when a new variant is added?
4. Why should discriminant fields use literal types instead of `string`?
5. Why does intersecting two object types with conflicting property types go wrong?
6. Why is exhaustiveness checking valuable in large codebases?

## Compare and contrast

1. Union vs intersection.
2. Discriminated union vs optional-field “state” object.
3. `status: 'success' | 'error'` on one object vs separate variants with those literals.
4. `switch` without `default` vs `default: assertNever(...)`.
5. `'meow' in a` narrowing vs discriminant-field narrowing (when you’d use each).
6. `type A = B | C` vs two interfaces (what you can’t do).

## Predict the output / checker result

Compile error or OK? If OK, what’s the narrowed type? Explain why.

1.
```ts
type T = { a: string } | { b: number };
function f(x: T) {
  console.log(x.a);
}
```

2.
```ts
type T = { a: string } | { b: number };
function f(x: T) {
  if ('a' in x) console.log(x.a);
}
```

3.
```ts
type U = string & number;
```

4.
```ts
type S =
  | { tag: 'a'; x: number }
  | { tag: 'b'; y: string };

function f(s: S) {
  if (s.tag === 'a') return s.x;
  return s.y;
}
```

5.
```ts
type S =
  | { tag: 'a'; x: number }
  | { tag: 'b'; y: string };

function f(s: S) {
  switch (s.tag) {
    case 'a':
      return s.x;
    case 'b':
      return s.y;
    default:
      const _e: never = s;
      return _e;
  }
}
// Later someone adds { tag: 'c'; z: boolean } to S but forgets a case.
```

6.
```ts
type Bad = { status: string; data?: number };
const ok: Bad = { status: 'success', error: 'nope' as any };
```
(Is `Bad` preventing invalid states? Comment on intent vs what the type allows — adjust if the snippet wouldn’t compile; explain the modeling issue.)

## Debugging

1. Diagnose:
```ts
type State = {
  status: 'loading' | 'success' | 'error';
  data?: User;
  error?: string;
};
function show(s: State) {
  if (s.status === 'success') return s.data!.name;
}
```

2. Diagnose: narrowing not working —
```ts
type Ev = { type: string; payload: unknown };
```

3. Diagnose:
```ts
type A = { id: string };
type B = { id: number };
type C = A & B;
// authors expected { id: string | number }
```

4. `render` compiles after adding `'cancelled'` to the union but crashes at runtime on that state. What did they likely omit?

## Application

1. Rewrite this bag as a discriminated union:
```ts
type FormState = {
  mode: string;
  values?: Record<string, string>;
  serverError?: string;
};
// intended modes: editing (values required), submitting (values required),
// error (serverError required), success (no extra fields)
```

2. Write `assertNever` and a `switch` on a three-variant `Shape` union (`circle`/`square`/`triangle`) that is exhaustive.

3. Model `Result<T, E>` as `Ok | Err` with a discriminant; write a helper `unwrap` that narrows or throws.

4. Show one case where `&` is the right tool (compose mixins), not `|`.

## Interview questions

1. Why are discriminated unions better than a single object with many optional fields?  
   **Follow-ups:** Show invalid state the bag allows. How does narrowing differ?

2. Explain union vs intersection with examples.  
   **Follow-ups:** What is `string & number`?

3. How does exhaustiveness checking with `never` work?  
   **Follow-ups:** What happens when a new variant is added?

4. What makes a good discriminant property?  
   **Follow-ups:** Why not `status: string`?

5. How do you narrow a `Cat | Dog` without a shared tag?

## Connections

1. Why does this pattern typically use `type` aliases from the type-vs-interface unit?
2. How does discriminated-union narrowing preview the general narrowing unit (`typeof`, predicates)?
3. How does encoding valid states in the type system reduce runtime checks / bugs in React fetch UI or Nest response mapping?
4. How is `never` here related to the idea of “this code shouldn’t run”?
5. When would you still use optional fields instead of a full tagged union?
