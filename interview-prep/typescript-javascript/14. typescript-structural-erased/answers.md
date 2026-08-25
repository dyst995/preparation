# TypeScript's Type System: Structural and Erased — Answers

## Core recall

1. **Structural typing:** types are compatible when the required **shape** (members) matches, regardless of declared name or inheritance pedigree.

2. **Nominal typing:** compatibility depends on an **explicit declared relationship** (same named type / `extends` / `implements`), not merely matching fields.

3. **Type erasure:** type-only constructs are removed during compilation; runtime JS has no interfaces/generics-as-types left to inspect.

4. **Interfaces aren’t values.** After erase there is no runtime object named `SomeInterface` for `instanceof` to test.

5. **Classes emit a constructor function** (a real runtime value) with a prototype, so `instanceof` can walk the prototype chain.

6. Examples: **`typeof`**, **`instanceof` (classes)**, **`'key' in obj`**, **`Array.isArray`**, custom predicates, **zod** / **class-validator**.

7. **`tsc` type-checks** (and optionally emits). Babel/SWC often **only strip/transform** TS syntax and may not type-check at all.

8. **No.** Generic type parameters are erased; you cannot `if (T === …)` or branch on `T` at runtime.

## Explain why

1. JavaScript APIs already care about **shapes**, not class names. Structural typing matches that ecosystem so plain objects and JSON-shaped data fit naturally without forced nominal hierarchies.

2. TypeScript targets existing JS VMs. Keeping types compile-time-only avoids a separate runtime and keeps output standard JavaScript.

3. Assignability of an **existing variable** asks “does it provide `x` and `y`?” (structural). A **fresh literal** also gets **excess property checking** to catch typos/extra fields when the object is created exactly for that target type.

4. `as User` only silences the checker. `JSON.parse` returns `any`-like runtime data; erasure means nothing verifies `email` exists unless you validate.

5. Strip-only tooling can emit JS from invalid TS. Without `tsc --noEmit` (or equivalent) in CI, type errors never fail the build.

6. Controller **types are erased**. HTTP bodies are untrusted runtime data. `class-validator` (or similar) performs **real checks**; types alone cannot reject bad JSON at runtime.

## Compare and contrast

1. **Structural:** same shape ⇒ compatible. **Nominal:** needs declared relationship even if shapes match.

2. **Interface:** types-only, erased, not a value. **Class:** type + runtime constructor/prototype; usable with `instanceof` / `new`.

3. **JS `typeof`:** runtime tag of a value. **TS `typeof` in type position:** compile-time query of a value’s static type; erased, never runs.

4. **`tsc`:** can prove type-correctness (and emit). **Babel/SWC:** fast emit/transform; checking is optional/separate.

5. **Compile-time safety:** catches misuse before run among typed code. **Runtime validation:** protects boundaries (I/O, JSON, user input) after erasure.

6. **General structural assignability:** “needed props present.” **Excess property checks:** extra guard on **fresh literals** assigned to a specific type — still not full nominal typing.

## Predict the output / checker result

1. **Type-checks; runs fine.** `a`’s inferred type has `x` and `y`; structural assignability to `Point` allows extra `z`.

2. **Compile error (excess property `z`).** Fresh literal targeted as `Point` — excess property check fires. (No emit of that call if `tsc` fails the project.)

3. **Compile error.** `User` is an interface — not a runtime value — so it can’t appear after `instanceof`.

4. **Logs `true`.** `User` is a class constructor; `instanceof` checks the prototype chain at runtime.

5. **Nothing of `T` remains.** Emit is roughly `function identity(x) { return x; }`.

6. **Logs `'number'`.** Runtime `typeof` on the value `1`; the `: number` annotation was erased and does not participate.

## Debugging

1. **`Animal` is an interface — not a value.** `instanceof Animal` is invalid. Fix: type predicate inspecting `name`, or a class, or a schema validator.

2. **`res.json()` is untyped/unsafe at runtime.** Returning it as `Promise<User>` is a compile-time claim only. Fix: validate (predicate/zod/DTO) before trusting shape.

3. **No typecheck gate in CI** — SWC emitted anyway. Fix: run `tsc --noEmit` (or project references check) on every PR.

4. **Interface typing doesn’t validate HTTP JSON.** Use a class DTO + `class-validator`/`ValidationPipe`, or zod, etc., then trust the typed result.

## Application

1. Example predicate:
```ts
interface Point { x: number; y: number }

function isPoint(v: unknown): v is Point {
  return (
    typeof v === 'object' &&
    v !== null &&
    'x' in v &&
    'y' in v &&
    typeof (v as Point).x === 'number' &&
    typeof (v as Point).y === 'number'
  );
}
```

2. Mutual assignability: `type A = { id: string }; type B = { id: string };` — assignable both ways. Intentional incompatibility sketch: `type UserId = string & { readonly __brand: 'UserId' }` vs raw `string`, or a class with a `#private` field so structural match fails without that field.

3. **CI:** `tsc --noEmit` proves types. **Emit:** SWC/esbuild strips/compiles quickly for shipping. Split keeps safety and speed.

4. Conceptual fix: `const UserSchema = z.object({ id: z.string(), email: z.string().email() }); type User = z.infer<typeof UserSchema>; const user = UserSchema.parse(JSON.parse(raw));` — or an equivalent predicate that throws/returns narrowly typed data.

## Interview questions

1. **Spoken:** “No. Interfaces are erased; there’s nothing to `instanceof`. Classes work because they emit constructors. For API JSON I’d use a type predicate or zod/class-validator — ideally one schema that also gives me the static type.”  
   **Follow-ups:** Classes ⇒ runtime values; validation libraries ⇒ real checks + optional type inference.

2. **Spoken:** “Structural typing means compatibility by shape. Nominal systems require an explicit type relationship even if fields match. TS follows JS’s shape-oriented style.”  
   **Follow-ups:** Downside — accidental structural matches; mitigate with brands/private fields when needed.

3. **Spoken:** “Types are erased from the JS output. Exceptions people mention: class constructors remain values; some enum forms emit objects; decorator metadata can emit extra data — but interfaces/generics-as-types don’t survive.”

4. **Spoken:** “`tsc` can type-check; Babel/SWC often only remove types for speed. Production pipelines should still run `tsc --noEmit` in CI if emit isn’t going through `tsc`.”

5. **Spoken:** “Excess property checks apply to fresh literals to catch typos when the object is created for a known target type. A wider variable only needs to be assignable structurally, so extra fields are allowed.”

## Connections

1. JS callers already pass “objects that look right.” Structural typing is the static version of that duck-typing habit.

2. Erasure ⇒ types can’t police HTTP/JSON alone ⇒ Nest/zod supply the runtime half while TS supplies compile-time half.

3. `instanceof` works with classes because of the **prototype / constructor** runtime model from JS fundamentals — same mechanism TS didn’t erase.

4. They mix the **runtime world** (JS operators on values) with the **type world** (compile-time-only operators erased on emit).

5. Excess property checks are a **narrow extra rule on literals**, not a switch to nominal typing — underlying assignability remains structural for non-fresh values.
