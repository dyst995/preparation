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

# Self-test

## Core recall

1. What is structural typing in TypeScript?
2. What is nominal typing, in contrast?
3. What does type erasure mean?
4. Why can’t you write `value instanceof SomeInterface`?
5. Why can `value instanceof SomeClass` work?
6. Name three runtime mechanisms for checking shapes/values after erasure.
7. What does `tsc` do that Babel/SWC often do not?
8. Do TypeScript generics exist as runtime values you can branch on?

## Explain why

1. Why does TypeScript use structural typing instead of Java-like nominal typing by default?
2. Why is erasure a deliberate design for TypeScript-on-JavaScript?
3. Why does `const obj = { x, y, z }; logPoint(obj)` type-check while a fresh `{ x, y, z }` literal might error?
4. Why isn’t `JSON.parse(s) as User` a runtime guarantee?
5. Why can a project “use TypeScript” and still ship type errors if it only builds with SWC?
6. Why do Nest apps still use `class-validator` if controllers are already typed?

## Compare and contrast

1. Structural vs nominal typing.
2. Interface vs class regarding runtime existence.
3. JS value-`typeof` vs TS type-query `typeof` (high level).
4. `tsc` emit+check vs Babel/SWC strip-only.
5. Compile-time type safety vs runtime validation.
6. Excess property checking vs general structural assignability (seed-level).

## Predict the output / checker result

For each: does it type-check? What runs at runtime? Explain why.

1.
```ts
interface Point { x: number; y: number }
function f(p: Point) {}
const a = { x: 1, y: 2, z: 3 };
f(a);
```

2.
```ts
interface Point { x: number; y: number }
function f(p: Point) {}
f({ x: 1, y: 2, z: 3 });
```

3.
```ts
interface User { id: string }
function check(u: unknown) {
  return u instanceof User; // ?
}
```

4.
```ts
class User { constructor(public id: string) {} }
console.log(new User('1') instanceof User);
```

5.
```ts
function identity<T>(x: T): T { return x; }
// After compilation, what remains of T?
```

6.
```ts
const n: number = 1;
console.log(typeof n); // runtime: ?
```

## Debugging

1. Diagnose:
```ts
interface Animal { name: string }
function isAnimal(x: any) {
  return x instanceof Animal;
}
```

2. Diagnose false confidence:
```ts
type User = { id: string; email: string };
async function loadUser(res: Response): Promise<User> {
  return res.json();
}
```

3. Diagnose CI gap:
App builds with Vite/SWC in PRs; production crashed on a typo’d property access that `tsc` would have caught. What was missing?

4. Diagnose Nest confusion:
“I typed the body as `CreateUserDto` interface, so invalid JSON can’t reach my service.” What’s wrong?

## Application

1. Write a type predicate `isPoint(v: unknown): v is Point` for `{ x: number; y: number }`.

2. Given structural typing, show two differently named types that are mutually assignable, and one way to make them *intentionally* incompatible (sketch branded type or private-field class — brief is enough).

3. Sketch a pipeline: `tsc --noEmit` in CI + SWC for emit — one sentence why each part exists.

4. Replace an unsafe `as User` after `JSON.parse` with either a predicate or a zod-style conceptual step (API sketch is fine).

## Interview questions

1. Can you check `if (value instanceof SomeInterface)` in TypeScript?  
   **Follow-ups:** What about classes? How do you validate API JSON?

2. What is structural typing? How does it differ from nominal typing?  
   **Follow-ups:** Any downside of structural typing?

3. What happens to TypeScript types at runtime?  
   **Follow-ups:** Do enums/classes complicate that answer?

4. How does `tsc` differ from using Babel or SWC with TypeScript?  
   **Follow-ups:** How should CI be set up?

5. Why might excess property checks fire on an object literal but not on a variable with extra fields?

## Connections

1. How does structural typing relate to everyday JavaScript “duck typing”?
2. How does type erasure force a split between TypeScript types and Nest/zod validation?
3. How does the class/`instanceof` story connect to the prototypes unit from JavaScript fundamentals?
4. When someone confuses TS `typeof` in a type position with runtime `typeof`, which two “worlds” are they mixing?
5. How will excess property checks (next section) sit on top of structural typing without making TS nominal?
