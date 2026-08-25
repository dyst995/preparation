# Narrowing and Type Guards — Answers

## Core recall

1. Refining a wider type to a smaller one using control-flow analysis of runtime checks.

2. **`typeof`**, **`instanceof`**, **`in`**, **truthiness**, **equality** (including discriminants), plus **`Array.isArray`**; also custom **predicates** / **asserts**.

3. If the function returns **`true`**, treat the argument as **`Cat`** in the caller from that point (in the true branch).

4. If the function **returns normally**, `x` is a **`string`** afterward; otherwise it throws.

5. **`'object'`** (JS legacy quirk).

6. **`Array.isArray(x)`** (not `typeof`, which is `'object'` for arrays).

7. Interfaces are **erased** — no runtime constructor value for `instanceof`.

8. **`''` is falsy**, so `if (x)` also excludes empty string, not only nullish.

## Explain why

1. TS **trusts** the predicate’s boolean. A wrong implementation lies to the type system while emitting no extra runtime safety beyond what you wrote.

2. Because `typeof null === 'object'`, an “object” branch can still be null and crash on property access. Exclude null first (or use nullish checks).

3. After `return`, that control path is done; CFA removes the handled case from the **remaining** code’s type.

4. JSON is `unknown`/untyped at runtime; built-in guards don’t know your `User` shape. A predicate (or schema lib) encodes the runtime proof.

5. `in` is a **real check** that also narrows. Casting skips validation and can be wrong.

6. `as User` forces a compile-time view **without** requiring a runtime check or affecting control flow as a guard. It’s an unchecked claim.

## Compare and contrast

1. **`typeof`:** primitive tags (+ object/function). **`instanceof`:** prototype chain vs constructor function (classes/built-ins).

2. **Predicate:** returns boolean; use in `if`. **Assertion:** returns void; throws; narrows after the call.

3. **Predicate:** runtime test + CFA. **`as`:** no test; unchecked.

4. **Truthiness:** drops nullish **and** falsy values (`''`, `0`, …). **`!= null`:** only drops `null`/`undefined`.

5. **`in`:** property presence; good without a shared tag. **Discriminant equality:** intentional tag; best for designed unions + exhaustiveness.

6. **`Array.isArray`:** true arrays. **`typeof === 'object'`:** objects, arrays, and `null`.

## Predict the output / checker result

1. **OK.** After null return, `x` is `string`.

2. **`x` is still `null` in that branch** (and only null from that union matches `typeof === 'object'`). `string` has typeof `'string'`, so the object branch is `null` — a classic trap illustration. (If the union were `object | null`, same issue without prior null check.)

3. **OK.** String branch returns; remainder is `number`.

4. **OK.** Predicate narrows `v` to `string` in the `if`.

5. **OK.** After `assertStr`, `v` is `string`.

6. **OK.** Equality on discriminant narrows to `A` then `B`.

7. **Truthy branch:** non-empty `string`. **Else:** `''` (empty string literal type), not “no string.”

## Debugging

1. **`typeof null === 'object'`** — enters branch and calls method on `null`. Fix: `if (name === null) return;` then use object, or `if (name !== null)`.

2. **Truthiness treats `0` as missing.** Use `if (n != null) return n + 1`.

3. **`User` is an interface — not a value.** Use a predicate, discriminant, or a class.

4. **Predicate always true → unsound.** Implement real checks on `v`.

## Application

1. Example:
```ts
function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}
```

2. Example:
```ts
function assertDefined<T>(v: T | null | undefined): asserts v is T {
  if (v === null || v === undefined) throw new Error('undefined');
}
```

3. Example:
```ts
function print(r: Result) {
  if (r.ok === true) console.log(r.value);
  else console.error(r.error);
}
```

4. Example:
```ts
function isCat(a: { meow(): void } | { bark(): void }): a is { meow(): void } {
  return 'meow' in a;
}
```

5. Replace `if (n)` with `if (n !== null && n !== undefined)` or `if (n != null)`.

## Interview questions

1. **Spoken:** “JS reports `typeof null` as `'object'`, so object branches must exclude null explicitly or you crash. I check `=== null` / `== null` first; then CFA removes null.”  
   **Follow-ups:** `== null` also catches `undefined`; prefer explicit intent.

2. **Spoken:** “A return type `arg is T` means true ⇒ narrow `arg` to `T`. Needed when built-ins can’t express the check — API shapes, nested tags.”  
   **Follow-ups:** `as T` doesn’t test; predicates do.

3. **Spoken:** “Predicates return boolean for branching; asserts throw and narrow on success — good for invariants.”  
   **Follow-ups:** Throwing at boundaries vs soft validation UX.

4. **Spoken:** “TS eliminates cases along paths that return/throw, so later lines see what’s left — like human case analysis.”

5. **Spoken:** “All are runtime tests that let CFA drop union members: tags by equality, classes by instanceof, exclusive fields by `in`.”

## Connections

1. Discriminant `status === 'success'` is **equality narrowing** on a designed tag — same CFA engine as `typeof`.

2. Erased interfaces ⇒ no `instanceof` ⇒ **predicates/schemas** prove shapes at runtime.

3. After narrowing all variants, leftover should be **`never`** for exhaustiveness (`assertNever`).

4. Nest pipes/zod perform runtime validation then produce values TS can treat as typed — same “proof then trust” pattern as predicates, often richer.

5. Look for: missing null checks, truthiness overuse, reassignment widening, property vs local alias issues, predicates that don’t match implementation, using `as` instead of a guard.
