# 01. TypeScript's type system: structural and erased

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] Structural typing ("duck typing") vs nominal typing
- [ ] Type erasure - types exist only at compile time, gone at runtime
- [ ] What this means for `typeof`/`instanceof` checks (they check runtime values, never TS types directly)
- [ ] `tsc` as a type-checker + transpiler; how it relates to Babel/SWC (type-check vs strip-only tools)

### Core idea

TypeScript uses **structural typing**: two types are compatible if their *shapes* match, regardless of name or explicit declaration. This is fundamentally different from nominal typing (Java, C#), where compatibility depends on explicit declared relationships (`implements`/`extends`).

```ts
interface Point { x: number; y: number; }

function logPoint(p: Point) { console.log(p.x, p.y); }

const obj = { x: 1, y: 2, z: 3 }; // extra property, never declared as Point
logPoint(obj); // OK - obj structurally satisfies Point
```

This "if it has the right shape, it fits" philosophy is why TypeScript feels flexible compared to strictly nominal languages, and it's also the root of "excess property checks" surprising people (see section 2).

### Type erasure

All TypeScript type annotations are **removed entirely** during compilation - there is no runtime trace of types, interfaces, or generics. This has concrete consequences:

- You cannot do `if (x instanceof SomeInterface)` - interfaces don't exist at runtime.
- You cannot do runtime checks against a generic type parameter (`T`) - it's erased too.
- Any "is this the right shape" check at runtime must use actual JS mechanisms: `typeof`, `instanceof` (for classes, which *do* exist at runtime), `in`, or manual validation (e.g. `zod`, `class-validator` in NestJS).

### Interview question

**Q: Can you check `if (value instanceof SomeInterface)` in TypeScript?**

**Strong answer:**
> "No - interfaces are a compile-time-only construct and are fully erased; there's nothing left at runtime to check against. `instanceof` only works with things that exist at runtime, like classes, because a class produces an actual constructor function with a prototype. If I need a runtime shape check, I either write a custom type predicate function that inspects the object's properties, or use a validation library like `zod` or NestJS's `class-validator`, which do real runtime checks and can also serve as the single source of truth that generates the static type."

---
