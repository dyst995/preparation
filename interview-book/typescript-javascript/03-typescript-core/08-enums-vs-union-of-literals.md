# 08. Enums vs union-of-literals

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] Numeric enums, string enums, `const enum`
- [ ] Runtime footprint - regular enums compile to actual JS objects; union literals compile to nothing (fully erased)
- [ ] Reverse mapping quirk of numeric enums
- [ ] Why many style guides (including TS's own team, in some contexts) now favor union-of-string-literals or `as const` objects over `enum`
- [ ] `as const` for literal-inference object maps as an enum alternative

### Enums, concretely

```ts
enum Role { Admin, Editor, Viewer }
// compiles to a real runtime object:
// var Role; (function (Role) {
//   Role[Role["Admin"] = 0] = "Admin";
//   Role[Role["Editor"] = 1] = "Editor";
//   Role[Role["Viewer"] = 2] = "Viewer";
// })(Role || (Role = {}));

Role.Admin;    // 0
Role[0];       // 'Admin' - reverse mapping, numeric enums only, often surprising
```

String enums avoid the confusing reverse-mapping behavior but still generate a runtime object:

```ts
enum Role { Admin = 'ADMIN', Editor = 'EDITOR', Viewer = 'VIEWER' }
```

### Union-of-literals alternative

```ts
type Role = 'admin' | 'editor' | 'viewer';

const ROLES = { Admin: 'admin', Editor: 'editor', Viewer: 'viewer' } as const;
type RoleValue = typeof ROLES[keyof typeof ROLES]; // 'admin' | 'editor' | 'viewer'
```

| | `enum` | Union of string literals |
|---|---|---|
| Runtime footprint | Real JS object (extra bundle size) | Zero - fully erased, pure compile-time |
| Interop with plain strings | Requires the enum member, not just the string value (unless using string enum values loosely) | A plain string literal `'admin'` just works |
| Reverse mapping | Yes for numeric enums (surprising) | N/A |
| Tree-shaking friendliness | Worse (an object with all members) | Better (nothing to ship) |
| `const enum` option | Inlines values, no runtime object - but has tooling/isolatedModules caveats | N/A, always erased |

### Interview question

**Q: Why might a team prefer `type Role = 'admin' | 'editor' | 'viewer'` over `enum Role`?**

**Strong answer:**
> "Union-of-literals is fully erased at compile time - zero runtime cost, nothing added to the bundle - while a regular `enum` compiles to an actual JS object shipped to the client, which matters for bundle size in a React or React Native app. Union literals also interop more naturally with plain JSON/API data, since a string like `'admin'` coming back from a REST endpoint is directly assignable to the union type without an explicit mapping step, whereas comparing against enum members can require care about numeric vs string enum semantics. The tradeoff is that enums give you a namespaced grouping (`Role.Admin`) and, for numeric enums, an implicit ordering, which can occasionally be genuinely useful - so it's a real tradeoff, not a strict 'enums are bad' rule, but for most API-facing DTO fields I default to string literal unions."

---
