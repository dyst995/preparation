# 06. Strict mode, unpacked

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] `strict: true` is a shortcut that enables ~8 individual flags, not one setting
- [ ] `strictNullChecks` - the single highest-impact flag; `null`/`undefined` are not assignable to other types unless explicit
- [ ] `noImplicitAny` - disallows inferred `any` on untyped parameters/variables
- [ ] `strictFunctionTypes` - stricter (contravariant) checking of function parameter types
- [ ] `strictPropertyInitialization` - class properties must be initialized or explicitly allowed to be undefined
- [ ] `useUnknownInCatchVariables` - `catch` variables typed as `unknown`, not `any` (recap from ch.3)
- [ ] `alwaysStrict`, `noImplicitThis`, `strictBindCallApply` - lower-profile but real

### Why `strictNullChecks` matters most

Without it, `null` and `undefined` are silently assignable to *every* type - `let name: string = null` compiles fine, which defeats a huge portion of the type system's value, since "the type says `string` but it might actually be `null`" is one of the most common real-world sources of runtime crashes (`Cannot read properties of null/undefined`).

```ts
// without strictNullChecks
function getLength(s: string) { return s.length; }
getLength(null); // compiles fine, crashes at runtime

// with strictNullChecks
function getLength(s: string) { return s.length; }
getLength(null); // compile error: Argument of type 'null' is not assignable to 'string'

function getLengthSafe(s: string | null) {
  if (s === null) return 0;
  return s.length; // narrowed to string here
}
```

### Interview question

**Q: What does `strict: true` actually do, and which individual flag matters most in your experience?**

**Strong answer:**
> "`strict` is a bundle flag that turns on around eight individual compiler options at once - `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`, `noImplicitThis`, and `strictBindCallApply`. In my experience `strictNullChecks` has the biggest real-world impact by far - without it, `null` and `undefined` are silently assignable everywhere, which erases a huge amount of the safety TypeScript is supposed to provide, since 'null reference' style crashes are one of the most common production bugs in JS apps. `noImplicitAny` is a close second because it stops untyped parameters from silently becoming `any` and quietly disabling checking for anything that touches them."

### `strictPropertyInitialization` and Nest classes

```ts
class UserService {
  private users: User[]; // error under strictPropertyInitialization: not initialized

  constructor(private readonly repo: UserRepository) {} // fine - assigned via parameter property
}
```

This flag is why you'll see either a default value (`private users: User[] = []`), a definite assignment assertion (`private users!: User[]`, used sparingly and only when you're certain something else initializes it, e.g. a DI-injected property), or constructor-parameter properties (`constructor(private readonly repo: UserRepository) {}`) throughout well-typed Nest code.

---
