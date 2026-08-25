# `type` vs `interface` — Answers

## Core recall

1. **Unions**, **tuples / primitive aliases**, **mapped and conditional types** (and similar type-level algebra). Interfaces can’t be those top-level forms.

2. Multiple `interface` declarations with the **same name** combine into one interface with all members.

3. **No.** A second `type` with the same name is a duplicate-identifier error.

4. **`interface`:** `extends`. **`type`:** intersection `&` (for object composition).

5. **No.** Excess property checks apply to fresh literals for **both** `interface` and `type` targets.

6. **Yes**, if the `type` aliases an object shape (not a union/primitive-only alias that isn’t implementable as a class instance shape).

7. **Declaration merging** — e.g. augment Express `Request` with `user` in Nest.

8. Need a **union**, **tuple**, **mapped/conditional** type, or intersection-heavy composition that isn’t a clean `extends` tree.

## Explain why

1. So libraries and apps can **open** a public object type and add members without editing the original package — typings stay extensible (globals, plugins, middleware-added fields).

2. An `interface` name always denotes an **object type** (possibly with call/construct signatures). A union is a different kind of type; only a `type` alias can name `A | B`.

3. Any speed difference is marginal and situational. Interviewers want **expressiveness / merging / unions**, not micro-optimizer folklore.

4. Merging gives a **project-wide** typed `req.user` without littering `as any`. Safer refactors; autocomplete; compile errors if middleware and handlers disagree.

5. Both describe structural object shapes. Without unions, mapped types, or merging needs, features overlap — style/consistency dominates.

6. **`interface` is designed to merge**; **`type` introduces a single alias binding** — redeclaring that binding conflicts like a duplicate `const` name in the type space.

## Compare and contrast

1. **`extends`:** OOP-readable hierarchy, conflict → clear errors, merge-friendly interfaces. **`&`:** general composition, works with unions/mapped types, contradictory props can collapse toward `never`/unusable types.

2. **Merging:** same name, automatic combine, used for augmentation. **Manual `A & B`:** new alias name, no reopening of the library’s original interface identity unless you use the intersection everywhere.

3. **Props DTO:** `interface` (or either) fine. **`Success | Error`:** must be `type` (union).

4. Both check the class instance against the shape. Keyword difference is mostly convention; object-shaped `type` works with `implements` too.

5. **Augment/merge:** `Request` itself gains `user` everywhere that type is used. **Wrapper intersection:** you must thread `MyRequest` through your signatures; library callbacks still see stock `Request` unless you cast/augment.

## Predict the output / checker result

1. **Compiles.** Merged `A` has `x` and `y`; value matches.

2. **Compile error** — duplicate `type A`.

3. **Compile error** — `Id` can’t be both a `type` alias and an `interface` name in the same scope (duplicate identifier / conflicting declarations).

4. **Compile error** — excess property `z` on fresh literal assigned to `Point` interface.

5. **Compile error** — same excess property check for `type` alias target.

6. **Compile error** — can’t declare `interface Result` when `type Result` already exists (or vice versa depending on order); same name conflict. Also an interface can’t replace a union alias meaningfully via merge.

## Debugging

1. **`type` doesn’t merge.** Use `interface Request` merges, or `type RequestWithUser = Request & { user: User }`, or proper `declare module` augmentation of Express’s `Request` interface.

2. **`interface` can’t be a string union.** Fix: `type Status = 'on' | 'off'`.

3. **Wrong scope / not module augmentation.** A local `interface Request` doesn’t merge with Express’s `Request` unless you `declare module '…'` (correct module) or augment the global that Express uses. Fix the augmentation target; ensure the `.d.ts` is included in `tsconfig`.

4. **Incompatible redeclare of `x`.** `number` vs `string` in extending interface is an error — property types must be compatible when overriding/extending.

## Application

1. Prefer **`type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }`** — it’s a **discriminated union**; interfaces can’t name that union.

2. Sketch:
```ts
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
  }
}
```
(Adjust module name to match installed Express types.)

3. Example:
```ts
type Animal = { name: string };
type Dog = Animal & { breed: string };
```

4. Mapped modifiers need a **mapped `type`** (e.g. `{ readonly [K in keyof T]?: T[K] }` or `Readonly<Partial<T>>`). Interfaces can’t express arbitrary key remapping; utilities are `type` aliases.

## Interview questions

1. **Spoken:** “Declaration merging. In Nest I augment Express `Request` with `user` after auth so handlers see a typed field. A second `interface` merges; a second `type` name errors.”  
   **Follow-ups:** `type` can’t reopen the same alias; you’d intersect under a new name or cast.

2. **Spoken:** “Unions, tuples, mapped and conditional types — e.g. `Success | Failure` or `Partial`-style mappings. Also when `&` composition is clearer than a deep `extends` chain.”

3. **Spoken:** “Same-named interfaces combine members. Used for globals and `declare module` augmentation. Different from writing `A & B` under a new alias.”  
   **Follow-ups:** Global vs module augmentation depends on whether the original type is global or exported from a module — augment the right place.

4. **Spoken:** “For plain object shapes, nearly yes. Differences: merging, and `type`’s ability to alias non-object forms. Excess property checks and `implements` apply to object shapes for both.”

5. **Spoken:** “Default `interface` for public object DTOs/props; `type` for unions and computed types. Consistency beats dogma.”

## Connections

1. Both tools name **structural** shapes; assignability still follows shape, not the keyword.

2. Neither emits a runtime value; `instanceof` still impossible; validation remains separate.

3. Merging is how TS typings stay open for JS libraries that grow fields at runtime (middleware, plugins).

4. Prefer wrapper intersection when you don’t own/augmentation is awkward or you want the enriched type **only** in your layer — you lose automatic widening of the library’s own `Request` name.

5. Utilities are implemented as **mapped/conditional `type`s**. Even if `User` is an `interface`, `Partial<User>` is a `type` alias result — hybrid style is normal.
