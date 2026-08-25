# `unknown` vs `any` — Answers

## Core recall

1. **Turns off type checking** for that value — almost any operation is allowed at compile time.

2. **Narrow** it (typeof, instanceof, predicates, schema parse) — or intentionally assert.

3. **`any` → yes** (assignable to `string` without proof). **`unknown` → no** without narrowing/assertion.

4. Untyped libraries / missing `@types`, **implicit any** (`noImplicitAny` off), **`JSON.parse`**, plus `as any` / loose mocks.

5. Typically **`any`**; safer to treat as **`unknown`** immediately, then validate.

6. Thrown values aren’t always `Error`; `unknown` forces narrowing before `.message`, etc.

7. Values derived from `any` often become `any` too, so checking disappears downstream.

8. **No** — you can pass/store/log `unknown`; you just can’t treat it as structured typed data until narrowed.

## Explain why

1. The checker doesn’t verify that `foo`/`bar` exist on `any`; runtime still does normal JS property access and throws.

2. `unknown` forbids property access until a control-flow proof exists, so those crashes become compile errors first.

3. `as User` only changes the static view; invalid JSON still yields missing fields at runtime.

4. It blocks unannotated parameters from silently becoming `any` and infecting the codebase.

5. `throw` can use any value; errors are a high-traffic “untrusted shape” path — same reason as JSON boundaries.

6. Inference flows through returns/properties; once a helper returns `any`, callers’ locals become `any` and lose protection.

## Compare and contrast

1. **`any`:** unchecked + contagious. **`unknown`:** must prove before use; not assignable to precise types freely.

2. **`object`:** non-primitive (but `typeof null` issues historically; not for “any JSON value”). **`unknown`:** truly any value including primitives/null — better for unvalidated input.

3. **Narrowing:** runtime check + CFA. **`as T`:** compile-time claim only.

4. **`unknown`:** safe discipline. **`any`:** allows `e.message` unsoundly.

5. **Generics:** preserve specific types across reuse. **`any`:** destroys specificity.

6. **zod parse:** runtime proof then typed output. **`as User`:** no proof.

## Predict the output / checker result

1. **Compile error** — can’t call methods on `unknown`.

2. **Both OK for checker** — `any` allows anything; `nope()` is a runtime risk.

3. **Compile error** — `unknown` not assignable to `string`.

4. **OK** — `any` assignable to `string` (unsound hole).

5. **OK** — narrowed to `number` in the branch.

6. **Compile error** (with `unknown` catch) — `err` is `unknown`, no `.message` until narrowed.

## Debugging

1. **`JSON.parse` → `any`**, then unchecked deep access. Fix: `unknown` + predicate/zod before `.email`.

2. **`raw: any`** makes `settings`/`port` unchecked. Type `raw` as `unknown` and validate shape, or type the config interface properly.

3. **`err` may not be `Error`.** Narrow: `err instanceof Error ? err.message : String(err)`.

4. Implicit `any` on callbacks/params returns; whole features lose checking — “annoying annotations” were the safety net.

## Application

1. Sketch:
```ts
function isUser(v: unknown): v is User { /* checks */ }
function parseUser(json: string): User {
  const data: unknown = JSON.parse(json);
  if (!isUser(data)) throw new Error('invalid user');
  return data;
}
```

2. Sketch:
```ts
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
```

3. `function safeGet(): unknown { return legacyGet() as unknown; }` then narrow at call site (or validate once inside a typed wrapper returning `User`).

4. Conceptual: `UserSchema.parse(JSON.parse(s))` throws/returns validated `User`; `as User` skips validation.

## Interview questions

1. **Spoken:** “Anything can be thrown. `any` lets you read `.message` unsoundly; `unknown` forces `instanceof Error` (or similar) first — correct for error handling.”  
   **Follow-ups:** strings/numbers/objects can be thrown; narrow before use.

2. **Spoken:** “Libs without types, implicit any, `JSON.parse`. For JSON I assign to `unknown` and validate with zod or a predicate — don’t let `any` flow.”  
   **Follow-ups:** same for poorly typed deps — facade + validation.

3. **Spoken:** “Both mean unknown shape; `any` disables checks and infects; `unknown` requires narrowing and won’t assign to `string` freely.”

4. **Spoken:** “Rare migration/interop escapes with a small surface and a plan to remove — never as default in new code.”

5. **Spoken:** “Types erase, so JSON isn’t checked at runtime; `unknown` makes you add the runtime proof erasure removed.”

## Connections

1. `typeof` / `instanceof` / predicates / asserts are how you exit `unknown`.

2. Erased types can’t validate payloads — boundaries must be `unknown` (or validated schemas) or you’re lying with `any`/`as`.

3. Generics keep relationships; `any` is the opposite of that goal for reusable APIs.

4. Nest DTO pipes/zod: body starts untrusted → validate → typed DTO (`unknown → T` pipeline).

5. Unions model **known** alternatives you designed; `unknown`/`any` are for **not yet known** values — don’t replace domain unions with `any`.
