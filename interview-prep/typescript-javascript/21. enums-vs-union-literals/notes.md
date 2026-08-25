# Enums vs Union-of-Literals

## What you need to know

TypeScript offers **enums** (runtime objects) and **string/number literal unions** (usually fully erased) for closed sets of values. Many modern codebases — especially React/RN — **default to literal unions** or `as const` objects; enums remain useful for namespacing and some numeric domains.

Curriculum checklist:

- Numeric enums, string enums, `const enum`
- Runtime footprint vs full erasure
- Numeric enum reverse mapping
- Why unions / `as const` are often preferred
- `as const` object maps as an enum alternative

Related: [erasure](../14.%20typescript-structural-erased/notes.md), [literal unions / discriminants](../16.%20unions-intersections-discriminated/notes.md).

---

## Numeric enums

```ts
enum Role {
  Admin, // 0
  Editor, // 1
  Viewer, // 2
}

Role.Admin; // 0
Role[0]; // 'Admin' — reverse mapping
```

### Runtime emit (preserved idea)

A regular enum compiles to an IIFE that builds a **real JS object** with forward and (for numeric) reverse entries — shipped in the bundle unless tree-shaken carefully (often kept whole).

### Reverse mapping

Numeric enums add `Role[0] === 'Admin'` and `Role['Admin'] === 0`. Surprising consequences:

- `Object.keys(Role)` includes both names and numbers (stringified).
- Iterating enum objects needs care (`typeof value === 'string'` filters).
- Accidental `Role[Role.Admin]` style confusion for newcomers.

---

## String enums

```ts
enum Role {
  Admin = 'ADMIN',
  Editor = 'EDITOR',
  Viewer = 'VIEWER',
}
```

- Still a **runtime object**.
- **No** reverse mapping (`Role.ADMIN` style keys aren’t auto-created from values).
- Values are stable strings — closer to API payloads, but you often still compare `role === Role.Admin` rather than treating any `'ADMIN'` the same depending on typing/`enum` nominal-ish behavior.

### Nominal flavor (awareness)

String enums are somewhat **nominal**: a plain `'ADMIN'` string may not be assignable to `Role` without a cast, whereas `'admin'` is assignable to `type Role = 'admin' | …`. That can be a feature (stricter) or a pain (JSON interop).

---

## `const enum`

```ts
const enum Direction {
  Up,
  Down,
}
const d = Direction.Up; // inlines to 0 in emit (typical tsc)
```

- Members are **inlined**; no runtime object from `tsc`’s classic emit.
- Caveats with **`isolatedModules` / Babel / SWC`**: tools that don’t see the whole program may forbid or mishandle `const enum` (need `preserveConstEnums` or avoid them).
- Harder to debug (values appear as magic numbers/strings in output).

Prefer literal unions over `const enum` unless you control a `tsc`-centric pipeline and want inlining.

---

## Union-of-literals (preferred default for many teams)

```ts
type Role = 'admin' | 'editor' | 'viewer';

function canEdit(role: Role) {
  return role === 'admin' || role === 'editor';
}

canEdit('admin'); // ok — plain string literal
```

- **Zero runtime footprint** for the type — fully erased.
- JSON/`'admin'` from APIs assigns naturally (after validation).
- Pairs with discriminated unions (`status: 'loading' | 'success'`).

---

## `as const` object maps (enum ergonomics without enum)

```ts
const ROLES = {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer',
} as const;

type Role = (typeof ROLES)[keyof typeof ROLES]; // 'admin' | 'editor' | 'viewer'
```

You get:

- Namespaced values: `ROLES.Admin`
- Derived union type from values
- A runtime object **only if you use it** — and it contains only what you listed (no reverse map)
- Good tree-shaking if you import individual constants carefully (bundler-dependent)

Alternate pattern:

```ts
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];
```

Useful for iteration + type derivation together.

---

## Comparison table (preserved)

| | `enum` | Union of string literals |
|---|---|---|
| Runtime footprint | Real JS object (usually) | Zero for the type — fully erased |
| Interop with plain strings / JSON | Often needs enum member / cast (esp. string enums’ nominal feel; numeric is worse) | `'admin'` works with the union type |
| Reverse mapping | Numeric enums yes (surprising) | N/A |
| Tree-shaking | Worse (object with all members) | Better (nothing to ship for the type) |
| `const enum` | Inlines; tooling caveats | N/A — always erased |

---

## Interview framing (preserved)

**Q: Why prefer `type Role = 'admin' | 'editor' | 'viewer'` over `enum Role`?**

> Unions are erased — no bundle cost — while regular enums emit a JS object. Literals interoperate with JSON/API strings more naturally. Enums give `Role.Admin` namespacing and numeric ordering sometimes; for most API/DTO fields, default to string literal unions (or `as const` maps when you want a runtime namespace).

---

## When enums still make sense

- Existing codebase / library API already exposes enums  
- You want a **runtime** object to iterate/display labels and accept the cost  
- Numeric protocols with reverse lookup (rare; document carefully)  
- Aligning with a domain that already thinks in enums (some Java interop stories)

Otherwise: **union + `as const`**.

---

## Exhaustiveness

Literal unions work cleanly with `switch` + `assertNever` (unions unit). Enums do too (`switch (role) { case Role.Admin: … }`), but remember numeric enum quirks if values aren’t fixed carefully.

---

## Common mistakes and misconceptions

1. Assuming enums are erased like interfaces — **regular enums are not**.  
2. Iterating numeric enums without filtering reverse keys.  
3. Using numeric enums for API roles (`0`/`1` in JSON) — brittle.  
4. `const enum` + Babel/`isolatedModules` breakage.  
5. “Enums are banned” absolutism without knowing the tradeoff.  
6. Comparing string enum to loose string without understanding assignability.

---

## Connections to other concepts

```
closed set of values
  → literal union (erased)
    or enum (runtime object)
    or as const map (runtime + derived union)

API JSON strings
  → literal union + validation
    → fewer mappings than numeric enums

discriminated unions
  → literal tags, not numeric enums, as default style

bundle size (RN/React)
  → prefer erasure
```

---

## Interview perspective

You should be able to:

1. Show numeric enum reverse mapping.  
2. Contrast string enum vs union interop.  
3. Explain `const enum` + tooling caveats.  
4. Derive a union from `as const`.  
5. Give a balanced default: unions for DTOs; enums when namespacing/runtime object is wanted.

---

# Self-test

## Core recall

1. What runtime artifact does a regular `enum` produce?
2. What is reverse mapping, and which enums have it?
3. What is a `const enum`, and what’s the main caveat?
4. Do string literal union types add runtime code?
5. How do you derive a union type from an `as const` object?
6. Why might `'ADMIN'` not assign to a string `enum` type easily, while `'admin'` assigns to a string union?
7. What’s a typical default for API role/status fields in modern TS?
8. Name one reason to still use `enum`.

## Explain why

1. Why do numeric enums make `Object.keys` surprising?
2. Why are literal unions friendlier for REST JSON?
3. Why can regular enums hurt React Native bundle size more than unions?
4. Why do some build setups break with `const enum`?
5. Why use `as const` on a roles object instead of a plain object?
6. Why are numeric enums risky for public API contracts?

## Compare and contrast

1. Numeric enum vs string enum  
2. String enum vs string literal union  
3. Regular enum vs `const enum`  
4. `as const` object map vs `enum`  
5. Erased types (unions) vs emitted enum objects  
6. Enum namespacing (`Role.Admin`) vs `ROLES.Admin` const object  

## Predict the output / checker result

1.
```ts
enum Role {
  Admin,
  Editor,
}
console.log(Role.Admin, Role[0]);
```

2.
```ts
enum Role {
  Admin = 'ADMIN',
}
console.log(Role[0]); // ?
```

3.
```ts
type Role = 'admin' | 'editor';
const r: Role = 'admin';
```

4.
```ts
enum Role {
  Admin = 'ADMIN',
}
const r: Role = 'ADMIN'; // ok or error?
```

5.
```ts
const ROLES = { Admin: 'admin' } as const;
type Role = (typeof ROLES)[keyof typeof ROLES];
const x: Role = 'admin';
```

6.
```ts
const ROLES = { Admin: 'admin' };
type Role = (typeof ROLES)[keyof typeof ROLES];
// what is Role roughly?
```

## Debugging

1. API returns `"admin"` but code checks `role === Role.Admin` where `enum Role { Admin }` (numeric). What’s wrong?

2. Loop:
```ts
enum E {
  A,
  B,
}
for (const k in E) console.log(k);
```
Why so many keys?

3. CI fails on `const enum` with `isolatedModules`. Options?

4. Team ships a large RN app; many `enum`s show up in the bundle. Migration approach?

## Application

1. Replace `enum Status { Loading, Success, Error }` with a string literal union used as a discriminant.

2. Build `as const` `HTTP_METHODS` and derive `HttpMethod` type.

3. Write a type guard `isRole(v: unknown): v is Role` for `type Role = 'admin' | 'editor'`.

4. Show a numeric enum reverse-lookup example and a safer string-union alternative for the same domain.

## Interview questions

1. Why might a team prefer string literal unions over `enum`?  
   **Follow-ups:** Bundle size? JSON interop? When keep enums?

2. Explain numeric enum reverse mapping.  
   **Follow-ups:** Why is it confusing?

3. What is `const enum` and when is it problematic?

4. How do you get enum-like namespacing without `enum`?

5. Should status discriminants be numeric enums or string literals? Why?

## Connections

1. How does this choice interact with type erasure from the structural/erased unit?
2. How do literal unions power discriminated unions?
3. How does runtime validation (`unknown`/zod) pair with string unions for API enums?
4. When would `Record<Role, string>` labels differ between enum vs union `Role`?
5. How does tree-shaking (modules unit) relate to emitted enum objects?
