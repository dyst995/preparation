# 07. unknown vs any

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] `any` disables type checking entirely for that value - it's contagious (spreads to anything it touches)
- [ ] `unknown` is type-safe "I don't know yet" - you must narrow before using it
- [ ] Where `any` sneaks in silently (implicit any with `noImplicitAny` off, untyped third-party libs, `JSON.parse`)
- [ ] Correct use of `unknown` at boundaries: `catch` clause variables (TS 4.4+), external API responses, `JSON.parse` result

### The core difference

```ts
let a: any = 'hello';
a.toUpperCase(); // fine
a.nonExistentMethod(); // ALSO fine at compile time - any disables checking entirely
a = 5; // fine, no complaint
a.foo.bar.baz; // fine - no error, will crash at runtime

let u: unknown = 'hello';
u.toUpperCase(); // compile error - u could be anything, must narrow first

if (typeof u === 'string') {
  u.toUpperCase(); // fine - narrowed to string
}
```

`any` is best understood as "opt out of TypeScript for this value" - it not only skips checking on that variable, it **infects everything that touches it**, silently turning downstream code untyped too. `unknown` says "this could be anything, and I will force you to prove what it is before you can use it," preserving type safety while still allowing genuinely unknown-shaped data to flow through your code (e.g. `catch (err: unknown)`, third-party API responses, `JSON.parse`).

### Interview question

**Q: Why does modern TypeScript type `catch` clause variables as `unknown` instead of `any` (with `useUnknownInCatchVariables`)?**

**Strong answer:**
> "Because a thrown value in JS can genuinely be anything - not just `Error` instances, but strings, numbers, or arbitrary objects someone threw. Typing it as `any` would let you write `err.message` and have TypeScript silently accept it even though at runtime `err` might be a string with no `.message` property, causing a crash. Typing it as `unknown` forces you to narrow first - usually `if (err instanceof Error)` - before accessing any property, which is exactly the discipline you want around error handling, arguably the most 'anything could show up here' spot in a codebase."

### Interview question

**Q: Where does `any` sneak into a codebase even when people are trying to avoid it?**

**Strong answer:**
> "Three common places: untyped or poorly-typed third-party libraries without good `@types` packages, implicit `any` on function parameters when `noImplicitAny` is off or when a callback's parameter type can't be inferred, and `JSON.parse()`, which returns `any` by design since TypeScript can't know the shape of parsed JSON. My default for the `JSON.parse` case is to immediately validate/cast through a runtime schema (`zod`) or at minimum assert to `unknown` first and narrow, rather than let a bare `any` flow further into the codebase."

---
