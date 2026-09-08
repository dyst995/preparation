# `type` vs `interface`

## What you need to know

Both `interface` and `type` can describe **object shapes**. Day to day they overlap heavily. Interviews care about the **real differences**: declaration merging, what each can express (unions, mapped types, …), and a deliberate default you can defend.

Prerequisite: [structural typing & erasure](../14.%20typescript-structural-erased/notes.md) — neither construct survives as a runtime value; both are structural.

Curriculum checklist this unit completes:

- Shared ability to describe object shapes
- Declaration merging (`interface` only)
- `extends` vs intersection (`&`)
- What only `type` can alias (unions, tuples, primitives, mapped/conditional)
- Performance note (rarely decisive)
- Excess property checks apply to both
- Practical default + Nest `Request` augmentation story

---

## Same job: object shapes

```ts
interface UserI {
  id: string;
  name: string;
}

type UserT = {
  id: string;
  name: string;
};

function greet(u: UserI | UserT) {
  return u.name;
}
```

For a plain object shape with no unions or mapped types, **either works**. Consistency in a codebase often matters more than the pick.

Both are erased. Neither supports `instanceof`.

---

## Side-by-side (preserved)

| Capability | `interface` | `type` |
|---|---|---|
| Object shape | Yes | Yes |
| Extends/composition | `extends` (multiple) | `&` intersection |
| Declaration merging | Yes (same name merges) | No (duplicate name = error) |
| Union types | No | Yes (`type A = B \| C`) |
| Tuple / primitive alias | No | Yes |
| Mapped / conditional types | No | Yes |
| `implements` by classes | Yes | Yes (object-shaped types) |

---

## Declaration merging

### What it is

Multiple `interface` declarations with the **same name** in the same scope are **merged** into one interface with all members combined.

```ts
interface Window {
  myGlobal: string;
}
interface Window {
  anotherGlobal: number;
}
// Window has both myGlobal and anotherGlobal
```

```ts
type Foo = { a: string };
type Foo = { b: number }; // Error: Duplicate identifier 'Foo'
```

### Why it matters

This is how you **augment** third-party or global types without forking the library:

- Extending Express `Request` with `user` after auth middleware (Nest)
- Adding fields to `Window` / Node globals
- Plugin APIs that open an interface for consumers to merge into

### Module augmentation pattern (Nest-shaped)

```ts
// types/express.d.ts (sketch)
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; roles: string[] };
  }
}
```

Exact module name varies by Express typings version; the **idea** is: reopen an `interface`, merge members, get typed `req.user` in handlers.

**Interview reason to prefer `interface` (preserved):**

> Declaration merging. Augmenting Express `Request` with `user` after auth middleware is a real Nest case — a second `interface Request { user: User }` merges automatically. Redeclaring a `type` with the same name is a compile error.

---

## Composition: `extends` vs `&`

### Interface `extends`

```ts
interface Timestamped {
  createdAt: Date;
}

interface Entity extends Timestamped {
  id: string;
}
```

Reads clearly for “object is a specialization of another object.” Multiple `extends` allowed.

Conflicting members with incompatible types → error.

### Type intersection

```ts
type Timestamped = { createdAt: Date };
type Entity = Timestamped & { id: string };
```

`&` also composes object types. Differences that matter:

- `type` intersections participate in a wider algebra (unions, conditionals, …)
- Intersecting **contradictory** property types can yield `never` for that property (or hard-to-use types) — know that intersections are not always “extends with nicer errors”
- You **cannot** declaration-merge a `type`

For “DTO extends BaseDto,” `interface extends` is often the clearest. For “A & B & C where A might be a union,” `type` + `&` fits.

---

## What only `type` can do

### Unions

```ts
type Result = { ok: true; value: string } | { ok: false; error: string };
// interfaces cannot express this union as the top-level type
```

Object *members* of an interface can use union field types, but the **alias itself** cannot be a union — that’s a `type` job.

### Primitives, tuples, special aliases

```ts
type Id = string;
type Pair = [string, number];
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
```

### Mapped and conditional types

```ts
type ReadonlyPartial<T> = { readonly [K in keyof T]?: T[K] };
type NonNullableField<T> = T extends null | undefined ? never : T;
```

These are `type`-only. If your shape needs mapping over keys, you are in `type` land (utility types are built this way).

---

## `implements` and classes

Classes can `implements` an interface **or** an object-shaped type alias:

```ts
interface Printable {
  print(): void;
}

type AlsoPrintable = { print(): void };

class Doc implements Printable {
  print() {}
}

class Doc2 implements AlsoPrintable {
  print() {}
}
```

`implements` is a **check** that the instance shape matches; it does not invent runtime interface objects.

Prefer `interface` in public OOP-style APIs when you want the conventional `implements` reading — not because `type` cannot work for object shapes.

---

## Excess property checks (both)

Fresh object literals assigned to a target type get excess property checking, whether the target was declared with `interface` or `type`:

```ts
interface PointI {
  x: number;
  y: number;
}
type PointT = { x: number; y: number };

const f = (p: PointI) => {};
const g = (p: PointT) => {};

f({ x: 1, y: 2, z: 3 }); // Error — excess `z`
g({ x: 1, y: 2, z: 3 }); // Error — same
```

So “I used `type` so excess checks don’t apply” is false. This is about **fresh literals + target type**, not `type` vs `interface`.

---

## Performance folklore

Interfaces can be slightly cheaper for the checker in huge codebases in some historical/edge cases. **Rarely decisive** for app code. Do not lead an interview with “interfaces are faster” unless asked about compiler internals — lead with expressiveness and merging.

---

## Practical default (preserved)

> I default to **`interface`** for public object shapes — props, DTOs, API responses — because `extends` reads clearly and declaration merging is occasionally genuinely useful (Express `Request` in Nest). I reach for **`type`** for unions, tuples, mapped/conditional types, or when intersections compose better than an `extends` chain. For a plain object shape with no unions, they are nearly interchangeable; **consistency** matters more than the specific choice.

---

## Common mistakes and misconceptions

1. **“Always use interface” / “always use type”** — dogma without the merge/union distinction.
2. **Thinking `type` cannot be `implements`’d** for object shapes — it can.
3. **Expecting declaration merging on `type`.**
4. **Using `interface` for a union of variants** — need `type`.
5. **Believing excess property checks differ by keyword.**
6. **Module augmentation forgotten** — merging only works when you augment the correct module / global scope.
7. **Assuming interfaces exist at runtime** — still erased (previous unit).

---

## Connections to other concepts

```
structural typing
  → both interface and type describe shapes

declaration merging
  → interface-only
    → Nest/Express Request augmentation

need union / mapped / conditional
  → type alias

object DTO + extends
  → interface often clearest

erasure
  → neither is instanceof-able
    → runtime validation still separate
```

---

## Interview perspective

You should be able to:

1. Fill the comparison table from memory (merge, unions, mapped).
2. Give **declaration merging** as a concrete reason for `interface` (Express `Request`).
3. Give **unions / mapped types** as concrete reasons for `type`.
4. State a sane default without religious warfare.
5. Note excess property checks apply to both.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
