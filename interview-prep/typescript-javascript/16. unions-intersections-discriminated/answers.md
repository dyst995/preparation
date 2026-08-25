# Unions, Intersections, and Discriminated Unions — Answers

## Core recall

1. **`A | B`:** value is one of the constituents (or). **`A & B`:** value must satisfy both at once (and).

2. A type that allows only specific concrete values, e.g. `'success'`, `1`, `true` — often combined into `'a' | 'b'`.

3. A union of object types sharing a **tag property** with distinct literal types per variant, so checks on the tag narrow the whole object.

4. That shared property (e.g. `status`, `type`, `kind`) whose literal value identifies which variant you have.

5. Only properties that exist on **all** members of the union (common fields), until you narrow.

6. **`never`.** No value can be both a string and a number, so the intersection is empty.

7. In a `default`/`else` after handling all known tags, leftover type should be `never`. If it isn’t, a variant was missed — `assertNever` makes that a compile error.

8. The top-level type is a **union**; `interface` cannot declare `A | B` as itself. Use a `type` alias.

## Explain why

1. `data` exists only on the success variant. Before narrowing, the value might be loading/error, so accessing `data` is unsafe — the checker blocks it.

2. Optionals allow **illegal combinations** (success without data, success with error, etc.). The type doesn’t encode which fields belong together; tagged unions do.

3. After adding a variant, `default`’s argument is that leftover variant, not `never`. Assigning it to `never` / passing to `assertNever` fails type-checking — forcing a new `case`.

4. Narrowing needs **distinguishable unit types**. Plain `string` doesn’t eliminate variants when you check `=== 'success'` in a way that rewrites the whole object type as reliably as a literal discriminant field typed per variant. (With `status: string`, checks don’t refine sibling fields the same way.)

5. The same property can’t be two incompatible types at once; TS collapses that property toward **`never`**, making the intersection unusable for normal values.

6. New states added later can’t silently skip handlers — compile failures beat production “forgot to handle cancelled.”

## Compare and contrast

1. **Union:** alternatives. **Intersection:** simultaneous requirements. `|` widens options; `&` adds constraints (or yields `never`).

2. **Tagged union:** valid shapes only; strong narrowing. **Optional bag:** one blob, weak invariants, easy invalid states.

3. **One object with union status + optionals:** still one structural type, weak coupling of fields. **Separate variants each with their literal:** fields travel with the tag.

4. **No default:** may not fail when union grows. **`assertNever`:** leftover must be `never` or compile error.

5. **`in`:** good when variants don’t share a tag but have unique keys. **Discriminant:** clearer when you control the schema; better exhaustiveness story.

6. **`type A = B | C`:** names a union. **Two interfaces:** each is an object type; you still need a `type` (or inline `|`) to name the union of them.

## Predict the output / checker result

1. **Compile error.** `a` is not common to both union members.

2. **OK.** `'a' in x` narrows to the variant that has `a`.

3. **`U` is `never`.** Incompatible primitive intersection.

4. **OK.** After `tag === 'a'`, `x` exists; in the else branch TS knows `'b'` and allows `y`.

5. **After adding `'c'` without a case:** `default` assignment `const _e: never = s` **fails to compile** because `s` is the cancelled/`c` leftover, not `never`.

6. Modeling issue: `Bad` does **not** prevent invalid states — `status` is a wide string (in spirit of the bag pattern); even with a string-literal union on `status`, optionals still allow success-without-data etc. The sample’s `error` field isn’t even on `Bad` (would be excess / need cast). Point: **optional bags don’t encode valid combinations**; use a discriminated union.

## Debugging

1. **Optional bag + non-null assertion.** Prefer:
```ts
type State =
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };
```
Then `success` ⇒ `data` required; no `!`.

2. **`type: string` is not a literal discriminant.** Use `type: 'click' | 'nav' | …` or separate variants with literal `type` fields.

3. **They wanted a union of id types, but wrote an intersection.** `A & B` makes `id: string & number` → `never`. Fix: `type C = A | B`, or `id: string | number` on one type if that’s the domain.

4. Likely **no exhaustiveness guard** (no `assertNever` / incomplete switch) and runtime hit an unhandled branch — or they casted/`any`. Add tagged handling + `assertNever`.

## Application

1. Example rewrite:
```ts
type FormState =
  | { mode: 'editing'; values: Record<string, string> }
  | { mode: 'submitting'; values: Record<string, string> }
  | { mode: 'error'; values?: Record<string, string>; serverError: string }
  | { mode: 'success' };
```

2. Example:
```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number };

function assertNever(x: never): never {
  throw new Error('Unhandled: ' + JSON.stringify(x));
}

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.r ** 2;
    case 'square':
      return s.size ** 2;
    case 'triangle':
      return (s.base * s.height) / 2;
    default:
      return assertNever(s);
  }
}
```

3. Example:
```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw r.error;
}
```

4. Example: `type Entity = Identifiable & Timestamped` where both are object shapes you always need together — not alternatives.

## Interview questions

1. **Spoken:** “Optional bags allow invalid combinations; the compiler won’t stop `{ status: 'success', error: '…' }` without data. Discriminated unions make each variant carry only valid fields, narrow on the tag, and support exhaustiveness with `never`.”  
   **Follow-ups:** Show bag invalid state; show `switch` narrowing `data`/`error`.

2. **Spoken:** “`string | number` is either; `{ a: string } & { b: number }` is both fields. `string & number` is `never`.”

3. **Spoken:** “Handle every tag, then `default: assertNever(x)`. If a new variant appears, `x` isn’t `never` and compilation fails.”  
   **Follow-ups:** Adding `'cancelled'` without a case breaks the build at `assertNever`.

4. **Spoken:** “Shared property name, distinct literal types per variant, preferably required. `status: string` doesn’t tag variants for field-level narrowing.”

5. **Spoken:** “Use `'meow' in animal` / custom type predicates / unique fields — or refactor to add a shared tag if you own the type.”

## Connections

1. Naming `A | B` requires a **`type` alias**; interfaces can’t be unions.

2. Tag checks are control-flow narrowing; later you’ll use `typeof` / predicates the same way for non-tagged unions.

3. UI/API state machines become unrepresentable-invalid at compile time — fewer runtime “impossible” states in React/Nest mappers.

4. `never` marks **impossible leftover**; using it documents “if we got here, we failed to handle a case” and turns that into a type error when the proof fails.

5. Optional fields are fine for truly independent optional data (e.g. `nickname?: string` on a user). Use tagged unions when **modes** change which fields are meaningful together.
