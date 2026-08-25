# Enums vs Union-of-Literals — Answers

## Core recall

1. A **real JavaScript object** (IIFE-initialized) mapping names ↔ values (and reverse for numeric).

2. **`Enum[value] → name`** (and name → value). **Numeric** enums have it; string enums do not.

3. An enum whose members are **inlined** at compile time (no object in typical `tsc` emit). Caveat: **`isolatedModules` / Babel / SWC** may disallow or mishandle them.

4. **No** — the type is erased; only the string values you write in JS remain.

5. `type Role = (typeof ROLES)[keyof typeof ROLES]` after `const ROLES = { … } as const` (or `(typeof ARR)[number]` for const arrays).

6. String enums behave more **nominal**; plain string literals aren’t always assignable. String **unions** are satisfied by matching string literals directly.

7. **`type Role = 'admin' | …`** (or `as const` + derived union), not numeric enums.

8. Need a **runtime** namespace/object, existing APIs, or rare numeric reverse-lookup domains — accepting bundle cost.

## Explain why

1. Reverse mapping inserts **both** `"Admin"` and `"0"`-style keys, so enumeration shows twice as many entries as members.

2. Payloads are already strings; unions accept `'admin'` after validation without mapping through `Role.Admin` / numeric codes.

3. Each regular enum emits an object into JS; many enums inflate RN/web bundles. Unions add no type-only runtime.

4. Transpilers that compile files in isolation can’t safely resolve/inline `const enum` across the project without TS’s whole-program info.

5. Without `as const`, values widen to `string` and the derived type becomes `string`, not a closed union.

6. Wire formats with `0`/`1` are opaque, order-sensitive, and reverse-mapping confuses serialization; strings are self-describing.

## Compare and contrast

1. **Numeric:** auto numbers + reverse map. **String:** explicit string values, no reverse map, still runtime object.

2. **String enum:** runtime object, stricter assignability. **Union:** erased, JSON-friendly literals.

3. **Regular:** emits object. **`const`:** inlines; tooling caveats; less debuggable.

4. **`as const` map:** optional small runtime object you control + derived union; no reverse map. **`enum`:** special syntax + numeric quirks.

5. **Unions:** compile-time only. **Enums:** usually runtime values you can import/iterate.

6. Both give `Something.Admin` style access; const object is ordinary JS (tree-shake/import differently); enum is TS-emitted artifact.

## Predict the output / checker result

1. Logs **`0`** and **`'Admin'`** (forward + reverse).

2. Logs **`undefined`** (no reverse mapping on string enums; `0` isn’t a key).

3. **OK** — literal assignable to union.

4. **Often error** — `"ADMIN"` string not assignable to `Role` enum type without cast (nominal-ish string enum). (If it compiles under a loose setting, still teach the interop friction.)

5. **OK** — `Role` is `'admin'`.

6. **`Role` is `string`** (widened) — not a literal union.

## Debugging

1. **Numeric enum** → `Role.Admin` is `0`, API string never equals. Use string union/string enum values aligned with API, or map explicitly.

2. **Reverse keys** appear — filter `isNaN(Number(k))` or use a union/`as const` array to iterate.

3. Replace with literal unions/`as const`; or enable `preserveConstEnums` / use `tsc` project references; avoid `const enum` under Babel-only pipelines.

4. Migrate hot paths to string unions + `as const`; delete unused enums; measure bundle; keep enums only where a runtime object is required.

## Application

1. Example: `type Status = 'loading' | 'success' | 'error';` with `{ status: Status; … }` variants.

2. Example:
```ts
const HTTP_METHODS = { Get: 'GET', Post: 'POST' } as const;
type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];
```

3. Example:
```ts
function isRole(v: unknown): v is Role {
  return v === 'admin' || v === 'editor';
}
```

4. Enum: `Role[0]` → `'Admin'`. Alternative: `type Role = 'admin' | 'editor'` + map object for labels `Record<Role, string>`.

## Interview questions

1. **Spoken:** “Unions erase — no runtime object or bundle cost — and match JSON strings. Enums emit objects and reverse maps (numeric). I keep enums when I need a runtime namespace; for DTO fields I default to string unions.”  
   **Follow-ups:** RN bundle; `Role.Admin` via `as const`; not absolute ban.

2. **Spoken:** “Numeric enums add value→name entries, so `Role[0]` is `'Admin'` and keys duplicate when iterating.”  
   **Follow-ups:** Confuses serialization and `Object.keys`.

3. **Spoken:** “Inlines members, no object — but isolatedModules/Babel can break; unions are safer default.”

4. **Spoken:** “`const ROLES = { Admin: 'admin', … } as const` and `type Role = typeof ROLES[keyof typeof ROLES]`.”

5. **Spoken:** “String literals — readable in JSON, erased, perfect discriminants. Numeric enums fight APIs and exhaustiveness readability.”

## Connections

1. Unions follow the **erasure** model; regular enums are a deliberate **runtime** exception.

2. Discriminants are string (or literal) tags — unions are the natural fit.

3. Parse API → `unknown` → validate ∈ union (`zod.enum` / predicates) — no numeric reverse map needed.

4. `Record<Role, string>` with union `Role` requires all literal keys; with numeric enum, key types are messier (numbers + reverse strings).

5. Emitted enum objects are live exports — harder to drop than erased types; ties to module/bundler tree-shaking limits.
