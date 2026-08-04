# 03 - TypeScript Core

> Goal: Explain the TypeScript type system's core building blocks - types vs interfaces, unions/intersections, narrowing, generics, utility types, `unknown` vs `any`, type guards, and enums vs unions - with the precision of someone who reads the compiler's reasoning, not just someone who silences red squiggles.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Explain what TypeScript's type system actually is (structural, erased at compile time) and why that matters for design decisions.
2. Choose between `type` and `interface` deliberately, citing real differences, not folklore.
3. Use union and intersection types correctly, and explain discriminated unions as a design pattern.
4. Narrow types using `typeof`, `instanceof`, `in`, discriminant properties, and custom type predicates.
5. Write and reason about generic functions, generic constraints, and generic components/hooks.
6. Use the built-in utility types (`Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`, etc.) fluently and know when hand-writing a type is clearer.
7. Explain why `unknown` is safer than `any`, and use it correctly at API/library boundaries.
8. Contrast `enum` with union-of-string-literals and justify a default preference.

---

## 1. TypeScript's type system: structural and erased

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

## 2. `type` vs `interface`

### Topics to learn
- [ ] Both can describe object shapes; large overlap in day-to-day use
- [ ] `interface` supports declaration merging (multiple declarations combine); `type` does not
- [ ] `interface` can `extends` other interfaces (and classes can `implements` interfaces); `type` uses intersections (`&`) for composition
- [ ] `type` can alias primitives, unions, tuples, mapped/conditional types; `interface` cannot
- [ ] Performance: TS's structural checking can be marginally faster for interfaces at large scale (rarely decisive)
- [ ] Excess property checks apply to object literals assigned directly, regardless of `type`/`interface`

### Side-by-side

| Capability | `interface` | `type` |
|---|---|---|
| Object shape | Yes | Yes |
| Extends/composition | `extends` (multiple) | `&` intersection |
| Declaration merging | Yes (auto-merges same name) | No (error on duplicate name) |
| Union types | No | Yes (`type A = B \| C`) |
| Tuple / primitive alias | No | Yes |
| Mapped / conditional types | No | Yes |
| Implements (by classes) | Yes | Yes (object-shaped types only) |

```ts
// declaration merging - interface-only feature
interface Window {
  myGlobal: string;
}
interface Window {
  anotherGlobal: number;
}
// Window now has both myGlobal and anotherGlobal - used heavily for
// augmenting third-party/global types (e.g. extending Express's Request in Nest)

// type cannot do this - duplicate declaration is a compile error
type Foo = { a: string };
type Foo = { b: number }; // Error: Duplicate identifier 'Foo'
```

### Practical default (what to say in an interview)

> "I default to `interface` for public object shapes - props, DTOs, API response shapes - because `extends` reads clearly and declaration merging is occasionally genuinely useful (augmenting Express's `Request` type in NestJS middleware is a real example). I reach for `type` when I need unions, tuples, mapped or conditional types, or when composing several things together with intersections reads better than a chain of `extends`. In practice, for a plain object shape with no unions involved, the two are close to interchangeable, and consistency within a codebase matters more than the specific choice."

### Interview question

**Q: Give a concrete, real reason to prefer `interface` over `type`, beyond "it's convention."**

**Strong answer:**
> "Declaration merging. If you're augmenting a third-party type - a very common NestJS example is adding a custom `user` property to Express's `Request` interface after an auth middleware attaches it - you declare a second `interface Request { user: User }` in the same module augmentation namespace, and TypeScript merges it automatically. You cannot do that with `type`; redeclaring a `type` alias with the same name is a hard compile error."

---

## 3. Unions, intersections, and discriminated unions

### Topics to learn
- [ ] Union (`|`) - value can be one of several types
- [ ] Intersection (`&`) - value must satisfy all combined types simultaneously
- [ ] Literal types (`'success' | 'error'`) as the basis for discriminated unions
- [ ] Discriminated (tagged) unions - a shared literal "tag" property that lets TS narrow the whole shape
- [ ] Exhaustiveness checking with `never` in a `switch`'s `default` case

### Unions vs intersections

```ts
type StringOrNumber = string | number;         // union: either one
type NameAndAge = { name: string } & { age: number }; // intersection: both, combined
// NameAndAge is effectively { name: string; age: number }
```

A common trap: intersecting incompatible primitive types produces `never` (there's no value that is simultaneously `string` and `number`), while unions of object shapes give you access only to properties common to all members unless you narrow first.

### Discriminated unions - the single most useful TS pattern for real apps

```ts
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: User };
type ErrorState = { status: 'error'; error: string };

type FetchState = LoadingState | SuccessState | ErrorState;

function render(state: FetchState) {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.name; // TS knows state is SuccessState here - data exists
    case 'error':
      return state.error;     // TS knows state is ErrorState here - error exists
  }
}
```

The shared `status` literal property is the "discriminant." Once you check it (via `switch`, `if`, or destructuring), TypeScript narrows the *entire* union member's shape, giving you safe access to properties that only exist on that branch - with zero casting.

### Exhaustiveness checking

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function render(state: FetchState) {
  switch (state.status) {
    case 'loading': return 'Loading...';
    case 'success': return state.data.name;
    case 'error': return state.error;
    default: return assertNever(state); // compile error if a new state is added and unhandled
  }
}
```

If someone later adds `type CancelledState = { status: 'cancelled' }` to the union and forgets to handle it in the `switch`, `state` in the `default` branch is no longer `never` (it's now `CancelledState`), so passing it to `assertNever` fails to compile - catching a missed case *before* runtime.

### Interview question

**Q: Why are discriminated unions considered better than a single object with lots of optional fields, e.g. `{ status: string, data?: User, error?: string }`?**

**Strong answer:**
> "With all-optional fields, nothing stops you from constructing an invalid state like `{ status: 'success', error: 'oops' }` with both `data` missing and `error` present - the type doesn't encode the actual valid combinations, so you rely on discipline, not the compiler. With a discriminated union, each variant only carries the fields that are actually valid together, and TypeScript enforces that at construction time and narrows correctly on every read. It also unlocks exhaustiveness checking with `never`, so adding a new state and forgetting to handle it somewhere becomes a compile error instead of a runtime surprise."

---

## 4. Narrowing and type guards

### Topics to learn
- [ ] `typeof` narrowing (primitives)
- [ ] `instanceof` narrowing (classes)
- [ ] `in` operator narrowing (property existence)
- [ ] Truthiness narrowing (`if (value)`)
- [ ] Equality narrowing (`if (x === 'foo')`, discriminant checks)
- [ ] Custom type predicates (`function isX(v): v is X`)
- [ ] Assertion functions (`function assert(cond): asserts cond`)
- [ ] Control flow analysis - TS tracks narrowing through the function body, including after early returns

### The narrowing toolkit

```ts
function process(value: string | number | Date | null) {
  if (value === null) return;                 // equality narrowing
  if (typeof value === 'string') { /* string */ }
  else if (typeof value === 'number') { /* number */ }
  else if (value instanceof Date) { /* Date */ }
}
```

`typeof` only distinguishes JS primitive tags (`'string' | 'number' | 'boolean' | 'undefined' | 'object' | 'function' | 'symbol' | 'bigint'`) - notably `typeof null === 'object'`, a well-known JS wart that TypeScript still has to account for, which is why explicit `=== null` checks are common before a `typeof` chain.

### Custom type predicates

```ts
interface Cat { meow(): void; }
interface Dog { bark(): void; }

function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}

function speak(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow(); // narrowed to Cat
  } else {
    animal.bark();  // narrowed to Dog
  }
}
```

The `animal is Cat` return type is a **type predicate** - it tells the compiler "if this function returns `true`, treat the argument as `Cat` from this point forward in the calling scope." This is essential when the `in` operator or `typeof`/`instanceof` aren't expressive enough (e.g. checking a discriminant deep in a nested object, or validating an external API response shape).

### `in` operator narrowing

```ts
type Admin = { role: 'admin'; permissions: string[] };
type Guest = { role: 'guest' };

function describe(user: Admin | Guest) {
  if ('permissions' in user) {
    console.log(user.permissions); // narrowed to Admin
  }
}
```

### Interview question

**Q: Why is `typeof null === 'object'` a trap, and how does it affect narrowing code?**

**Strong answer:**
> "It's a long-standing bug baked into the language from JS's earliest days that can never be fixed without breaking the web. Practically, it means a `typeof value === 'object'` check will also be true for `null`, so any code branch relying on 'object' meaning 'has properties I can safely access' will throw if `value` is actually `null`. I always check `value === null` (or `value == null` to also catch `undefined`) explicitly before or alongside a `typeof` narrowing chain, and TypeScript's control flow analysis will correctly exclude `null` from the type in later branches once that check is in place."

---

## 5. Generics

### Topics to learn
- [ ] Generic functions - type parameters inferred from arguments
- [ ] Generic interfaces/types
- [ ] Generic constraints (`<T extends SomeShape>`)
- [ ] Default generic parameters (`<T = string>`)
- [ ] `keyof`, indexed access types (`T[K]`) combined with generics
- [ ] Generic React components/hooks and generic NestJS services/repositories

### Why generics exist

Generics let you write a function or type that's **reusable across many types** while still preserving the specific type information at each call site - the alternative is either duplicating code per type, or using `any`, which throws away all type safety.

```ts
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

firstElement([1, 2, 3]);       // inferred T = number, returns number | undefined
firstElement(['a', 'b']);      // inferred T = string, returns string | undefined
```

Without the generic, you'd either write `firstElement(arr: any[]): any` (loses all safety) or write one overload per type (doesn't scale).

### Constraints

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'nika', age: 30 };
getProp(user, 'name'); // string
getProp(user, 'age');  // number
getProp(user, 'nope'); // compile error - 'nope' is not a key of user
```

`K extends keyof T` constrains `K` to only the actual property names of `T`, and the return type `T[K]` (an **indexed access type**) resolves to the exact type of that property - this combination is how you get fully type-safe generic property access without casting.

### Generic React hook example (ties to your stack)

```ts
function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown }
  >({ status: 'idle' });

  const run = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await fn();
      setState({ status: 'success', data });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [fn]);

  return { state, run };
}

// Usage - T is inferred per call site
const { state } = useAsync(() => fetchUser(id)); // state.data (when success) is typed User
```

This is exactly why a hand-rolled `useAsync`/`useFetch` hook is a common interview take-home or whiteboard exercise - it exercises generics, discriminated unions, and closures all at once.

### Generic NestJS repository/service example

```ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
}

class UserRepository implements Repository<User, string> {
  async findById(id: string): Promise<User | null> { /* ... */ }
  async save(entity: User): Promise<User> { /* ... */ }
}
```

### Interview question

**Q: Why is `getProp<T, K extends keyof T>` better than `getProp(obj: any, key: string): any`?**

**Strong answer:**
> "The generic-constrained version gives you two things `any` can't: the `key` argument is restricted at compile time to actual property names of `obj`, so typos are caught before running the code, and the return type is inferred exactly as the type of that specific property, not a black-box `any` that silently allows any subsequent misuse. It's more code up front but eliminates an entire category of 'accessed the wrong/misspelled property and only found out at runtime' bugs."

---

## 6. Utility types

### Topics to learn
- [ ] `Partial<T>`, `Required<T>`
- [ ] `Readonly<T>`
- [ ] `Pick<T, K>`, `Omit<T, K>`
- [ ] `Record<K, V>`
- [ ] `Exclude<T, U>`, `Extract<T, U>`
- [ ] `NonNullable<T>`
- [ ] `ReturnType<F>`, `Parameters<F>`
- [ ] `Awaited<T>`
- [ ] Knowing these are built with mapped/conditional types under the hood (bridges to chapter 4)

### Quick reference

| Utility | What it does | Typical use |
|---|---|---|
| `Partial<T>` | all properties optional | PATCH endpoint bodies, partial form updates |
| `Required<T>` | all properties required | ensuring a config object is fully filled in |
| `Readonly<T>` | all properties `readonly` | immutable state shapes, Redux-style state |
| `Pick<T, K>` | keep only keys `K` | narrow a large DTO down to a form's fields |
| `Omit<T, K>` | drop keys `K` | DTO minus server-generated fields (`id`, `createdAt`) |
| `Record<K, V>` | object type with keys `K`, values `V` | lookup maps, e.g. `Record<UserId, User>` |
| `Exclude<T, U>` | remove union members assignable to `U` | strip one variant out of a union |
| `Extract<T, U>` | keep only union members assignable to `U` | pull one variant out of a union |
| `NonNullable<T>` | remove `null`/`undefined` from `T` | after a guard, express "definitely has a value" |
| `ReturnType<F>` | the return type of function type `F` | derive a type from an existing function instead of duplicating it |
| `Parameters<F>` | tuple of a function's parameter types | wrapping/proxying functions generically |
| `Awaited<T>` | unwraps nested Promise types | getting the resolved value type of an async function |

### Practical example - DTO derivation (ties directly to NestJS)

```ts
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// API response should never leak the password hash
type UserResponseDto = Omit<User, 'passwordHash'>;

// Creating a user - id and createdAt are server-generated
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string };

// Updating a user - everything optional except we still forbid changing certain fields
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>;
```

This pattern - deriving request/response DTOs from a single source-of-truth entity type using `Omit`/`Partial`/`Pick` - is exactly what shows up in real NestJS codebases and is a strong thing to bring up unprompted when discussing API design.

### Interview question

**Q: You have a `User` entity type with 15 fields. You need a type for a PATCH endpoint body where any subset of user-editable fields can be updated, but `id`, `createdAt`, and `passwordHash` should never be settable. How do you express that without duplicating the 15 fields?**

**Strong answer:**
> "`type UpdatableUserFields = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>`. `Omit` removes the fields that should never be client-settable, and `Partial` then makes every remaining field optional so a PATCH body can include any subset. This keeps a single source of truth - if a new field is added to `User`, this derived type picks it up automatically instead of needing to be maintained in two places."

---

## 7. `unknown` vs `any`

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

## 8. Enums vs union-of-literals

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

## Full interview question bank (with answer targets)

### Type system basics
1. **Is TypeScript's type system structural or nominal?** -> structural (shape-based compatibility).
2. **Do TypeScript types exist at runtime?** -> no, fully erased during compilation.
3. **Can you `instanceof` check against an interface?** -> no, only against classes (which have a runtime prototype).

### `type` vs `interface`
4. **Name a capability `interface` has that `type` doesn't.** -> declaration merging.
5. **Name a capability `type` has that `interface` doesn't.** -> unions, tuples, mapped/conditional types, primitive aliases.

### Unions & narrowing
6. **What is a discriminated union, and why use one?** -> shared literal tag property enabling safe, exhaustive narrowing; prevents invalid field combinations.
7. **How does exhaustiveness checking with `never` work?** -> unhandled union member in a `default` branch fails to compile-check against a `never`-typed parameter.
8. **Name 4 ways to narrow a union type.** -> `typeof`, `instanceof`, `in`, custom type predicate (`x is T`).

### Generics
9. **Why use a generic instead of `any` for a reusable function?** -> preserves per-call-site type accuracy instead of discarding all type information.
10. **What does `<K extends keyof T>` buy you?** -> restricts `K` to actual property names of `T`, with precise indexed-access return types.

### Utility types
11. **How would you derive a PATCH DTO from a full entity type?** -> `Partial<Omit<Entity, 'serverManagedFields'>>`.
12. **What does `Awaited<T>` do?** -> unwraps the resolved value type from a (possibly nested) Promise type.

### `unknown` vs `any`
13. **Core difference between `unknown` and `any`?** -> `unknown` requires narrowing before use; `any` disables checking entirely and is contagious.
14. **Why type `catch` variables as `unknown`?** -> a thrown value can be any type; forces safe narrowing before property access.

### Enums vs unions
15. **Runtime cost difference between `enum` and a union of string literals?** -> enums generate a real JS object; literal unions are fully erased.
16. **What's the numeric enum reverse-mapping quirk?** -> `Enum[0]` maps back to the member name string, doubling the generated object's keys.

---

## Hands-on drills (do these)

- [ ] Write a discriminated union for a network request state (`idle | loading | success | error`) and a `render` function with exhaustiveness checking via `never`.
- [ ] Write a generic `pluck<T, K extends keyof T>(items: T[], key: K): T[K][]` function and call it against an array of objects.
- [ ] Derive `CreateUserDto`, `UpdateUserDto`, and `UserResponseDto` from a single `User` entity type using `Omit`/`Partial`/`Pick`.
- [ ] Write a custom type predicate `isNonNullable<T>(value: T): value is NonNullable<T>` and use it to filter `null`/`undefined` out of an array with correct resulting type.
- [ ] Take a function typed with `any` parameters and refactor it to use `unknown` plus explicit narrowing.
- [ ] Rewrite an `enum Role { Admin, Editor, Viewer }` as a union-of-string-literals plus an `as const` object, and update all usages.
- [ ] Implement a tiny generic `Result<T, E>` type (`{ ok: true, value: T } | { ok: false, error: E }`) and a function that returns it instead of throwing.

---

## Senior red flags / green flags

### Green flags interviewers love
- You describe TypeScript's typing as structural and erased, with a concrete `instanceof`-on-interface example of why that matters.
- You justify `type` vs `interface` with declaration merging / unions, not "my team just picked one."
- You reach for discriminated unions unprompted when describing UI state or API response modeling.
- You can write a generic function with a `keyof` constraint from memory.
- You explain `unknown` as "safe `any`" and can justify `catch (err: unknown)`.
- You have an opinion on `enum` vs union literals backed by a real tradeoff (bundle size vs namespacing).

### Red flags
- "Interfaces and types are basically the same, just use whichever" with no ability to name a real difference.
- Reaches for `any` immediately when a type is "annoying," rather than trying `unknown` + narrowing or a quick generic.
- Cannot explain why `typeof null === 'object'` matters for narrowing logic.
- Writes union types with all-optional fields instead of discriminated unions for clearly mutually-exclusive states.
- Unaware that `enum` produces runtime code while literal unions do not.

---

## Tie-backs to your experience

- Typed `useState`/`useReducer`/custom hooks in React and RN rely directly on generics and discriminated unions (loading/success/error state machines are everywhere in data-fetching code).
- NestJS DTOs are a textbook use case for `Omit`/`Partial`/`Pick` derived from Prisma/TypeORM entity types - a strong, concrete talking point for backend interviews.
- Declaration merging (`interface`) is the standard way to type Express's augmented `Request` object after auth middleware attaches a `user` property in a Nest app.

---

## Mastery checklist

- [ ] I can explain structural typing and type erasure with a concrete example each.
- [ ] I can justify `type` vs `interface` with at least 2 real differences, not convention.
- [ ] I can write a discriminated union with exhaustiveness checking from memory.
- [ ] I can write a generic function with a `keyof`-constrained type parameter.
- [ ] I can derive at least 3 DTO variants from one entity type using utility types.
- [ ] I can explain `unknown` vs `any` and justify `catch (err: unknown)`.
- [ ] I can compare `enum` and union-of-literals on runtime cost and interop.
