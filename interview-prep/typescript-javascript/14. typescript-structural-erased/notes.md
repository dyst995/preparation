# TypeScript's Type System: Structural and Erased

## What you need to know

TypeScript’s type system is **structural** (compatibility by shape, not by name) and **erased** (types exist at compile time only; runtime is plain JavaScript).

That pair of facts explains:

- Why unnamed objects can satisfy interfaces
- Why `instanceof SomeInterface` is impossible
- Why Nest/zod validation is not optional “extra typing” — it is the **runtime** half of safety
- How `tsc` relates to Babel/SWC (check vs strip)

Curriculum checklist this unit completes:

- Structural typing vs nominal typing
- Type erasure and its consequences
- What `typeof` / `instanceof` / `in` actually check
- `tsc` as checker + emitter; Babel/SWC as strip-oriented pipelines

Excess property checks are mentioned as a consequence of structural typing; full treatment is the next curriculum section — here you only need the seed of *why* people get surprised.

---

## Structural typing

### What it is

Two types are compatible when their **members match** (the needed shape is present), not because they share a declared name or inheritance relationship.

Often called “duck typing” at a high level: if it has the properties you need, it fits.

```ts
interface Point {
  x: number;
  y: number;
}

function logPoint(p: Point) {
  console.log(p.x, p.y);
}

const obj = { x: 1, y: 2, z: 3 }; // never named Point
logPoint(obj); // OK — structurally a Point (extra `z` is fine when assigning a non-fresh variable)
```

### Why it exists / why it matters

JavaScript is already structural in practice: APIs care about properties/methods, not class pedigrees. TypeScript mirrors that so typing feels natural for JS.

Consequences:

- Easy interoperability with plain objects and JSON-shaped data
- “Named types” don’t create runtime brands
- Accidental structural matches can happen (two unrelated types with the same fields are assignable)

### Vs nominal typing

| | Structural (TS) | Nominal (typical Java/C#) |
|---|---|---|
| Compatibility | Shape matches | Explicit type relationship (`extends` / `implements` / same declared type) |
| Unrelated same-shape types | Often assignable | Not assignable without casts/adapters |
| Interfaces at runtime | Erased | Often reflective / present as types |

TS can *approximate* nominal styles (private fields, branded/`unique symbol` patterns) when you need intentional distinction — advanced topic; know that “TS is structural by default.”

### Fresh object literals (seed for excess property checks)

When you pass an **object literal** directly where a specific type is expected, TypeScript applies **excess property checks** — a special soundness aid on top of structural typing:

```ts
interface Point {
  x: number;
  y: number;
}

logPoint({ x: 1, y: 2, z: 3 }); // Error: `z` is excess on a fresh literal
```

Why the asymmetry with the earlier `obj` example? The variable `obj` already exists with its own inferred type; assigning it to `Point` only asks “does it *have* `x` and `y`?” A fresh literal is checked more strictly for typos / unintended fields. Full rules live in the next section; the mental model for *this* unit: **structural + a literal-specific guard**.

---

## Type erasure

### What it is

Type annotations, interfaces, type aliases, generics parameters as types, and most type-only constructs are **removed** during emit. The output is JavaScript with no type metadata (unless you use experimental/decorator emit features — still not “interfaces as runtime values”).

```ts
// input
function id<T>(x: T): T {
  return x;
}

// emit (approx)
function id(x) {
  return x;
}
```

### Why erasure exists

TypeScript is designed as a **typed layer on JavaScript**, not a separate VM. Runtime remains the JS engine you already run (Node, Hermes, browsers). Types guide the compiler and editor; they do not execute.

### Concrete consequences (preserved + expanded)

1. **No `instanceof` on interfaces / type aliases**
   ```ts
   interface User {
     id: string;
   }
   // value instanceof User // Error — User is not a value
   ```

2. **No runtime checks against generic `T`**
   ```ts
   function parse<T>(raw: string): T {
     return JSON.parse(raw); // lies to the type system; runtime is just JSON.parse
   }
   ```

3. **Classes *do* leave runtime values** — the constructor function — so `instanceof` works for classes:
   ```ts
   class User {
     constructor(public id: string) {}
   }
   new User('1') instanceof User; // true at runtime
   ```

4. **Enums** may emit runtime objects (depending on `const enum` / preserve settings). They are not erased the same way as interfaces — do not lump “all TS syntax vanishes equally.”

5. **`typeof` in JS** checks runtime values (`typeof x === 'string'`). That is unrelated to TypeScript’s type-level `typeof` operator in type positions (compile-time query of a value’s type). Same keyword, different worlds.

### Runtime validation is a separate concern

If you need “is this API payload a User?” at runtime:

- Custom **type predicate**: `function isUser(x: unknown): x is User { ... }`
- Schema libraries: **zod**, **io-ts**, Nest **class-validator** + DTOs
- Manual `typeof` / `in` / `Array.isArray` checks

Interview framing (preserved):

> Interfaces are compile-time only and fully erased — nothing to `instanceof`. Use classes for prototype checks, or write a type predicate / use zod or class-validator for real shape checks (and optionally derive static types from the same schema).

---

## What runtime checks actually check

| Mechanism | Checks | Exists because of |
|---|---|---|
| `typeof` (value) | JS typeof tags | Language runtime |
| `instanceof` | Prototype chain vs constructor | Class/function values |
| `'prop' in obj` | Property presence | Objects |
| `Array.isArray` | Array brand | Runtime |
| zod / class-validator | Schema rules you wrote | Your code / libs |
| TS type annotation | Nothing at runtime | Erased |

TypeScript may *narrow* types when it sees these checks in control flow — that is the type checker following your runtime logic, not types existing at runtime.

---

## `tsc`, Babel, and SWC

### Mental model

| Tool | Typical role |
|---|---|
| **`tsc`** | Type-check the program **and/or** emit JS (configurable) |
| **Babel / SWC** | Transform/strip TS syntax for speed; **often do not type-check** |
| **IDE language service** | Uses TS for squiggles as you type |

Common pipelines:

1. **`tsc` alone** — check + emit
2. **`tsc --noEmit` + bundler (SWC/esbuild/Babel)** — CI/typecheck separate from fast emit
3. **Babel/SWC only** — fast builds; types can be wrong until something runs `tsc --noEmit`

### Why this matters in interviews / Nest / RN

- “We use TypeScript” ≠ “every build type-checks” unless CI runs the checker.
- Erasure means a green Babel build can still ship unsound assumptions if nobody ran `tsc`.
- Nest DI metadata sometimes needs `emitDecoratorMetadata` / `reflect-metadata` — that is **extra emit**, not “interfaces surviving erasure.”

---

## Common mistakes and misconceptions

1. **“TypeScript types exist at runtime.”** They don’t (with limited enum/class exceptions for *values*).
2. **`instanceof` against an interface.** Impossible — not a value.
3. **Believing generics enforce runtime element types** after `JSON.parse` / network I/O.
4. **Equating structural typing with “no type safety.”** Still checked at compile time; different rule than nominal.
5. **Assuming Babel/SWC = full `tsc`.** Strip ≠ check.
6. **Confusing JS `typeof` with TS type-query `typeof`.**
7. **Thinking excess property errors mean TS is nominal.** It’s a special check on fresh literals within a structural system.

---

## Connections to other concepts

```
JS cares about shapes at runtime
  → TS structural typing mirrors that at compile time

types erased on emit
  → runtime safety needs JS checks / validators
    → Nest DTO + class-validator, zod, type predicates

classes emit constructor values
  → instanceof works
interfaces emit nothing
  → instanceof fails

tsc checks
  → Babel/SWC may only strip
    → CI must still type-check
```

Next curriculum section (`type` vs `interface`, excess property details) sits on this foundation: same structural rules, different declaration tools.

---

## Interview perspective

You should be able to:

1. Define structural typing with a same-shape / different-name example.
2. Contrast briefly with nominal typing.
3. Explain erasure and why `instanceof Interface` fails.
4. Say what you use instead for runtime validation.
5. Describe `tsc` vs Babel/SWC in one crisp comparison.
6. Mention excess property checks as a literal-specific guard without derailing into the full next section.

Strong one-liner:

> TypeScript checks shapes at compile time and deletes those checks from the output; anything you need at runtime you must validate with real JavaScript (or a library that generates both).

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
