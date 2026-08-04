# 04 - TypeScript Advanced

> Goal: Go beyond "uses TypeScript" into "understands the type-system machinery" - conditional types, mapped types, declaration merging, strict mode's individual flags, and how all of this shows up concretely in React props/hooks and NestJS DTOs/decorators. This is the chapter that separates confident senior answers from memorized syntax.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Read and write basic conditional types, including `infer`, and explain what problem they solve.
2. Read and write basic mapped types, and recognize how built-in utility types (from chapter 3) are implemented with them.
3. Explain declaration merging beyond `interface` - module augmentation, namespace merging - and where it shows up in real codebases (Express `Request` augmentation).
4. Type common React patterns precisely: component props, generic components, `useState`/`useReducer`/`useRef`, forwardRef, children.
5. Type common NestJS patterns precisely: DTOs with validation decorators, generic services/repositories, custom decorators, guards/interceptors.
6. Explain what `strict: true` actually turns on (it's a bundle of ~8 flags) and defend at least 3 of them individually.
7. Design a small, realistic DTO typing strategy end-to-end (request validation -> service layer -> response shape).

---

## 1. Conditional types

### Topics to learn
- [ ] Basic syntax: `T extends U ? X : Y`
- [ ] Distributive conditional types (conditional types distribute over union types automatically)
- [ ] `infer` keyword - extracting a type from within another type
- [ ] Practical built-ins implemented with conditional types: `Exclude`, `Extract`, `ReturnType`, `Awaited`
- [ ] When to reach for a conditional type vs when it's overkill

### Basic syntax

A conditional type picks between two types based on a type-level `extends` check - read `extends` here as "is assignable to," not class inheritance.

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>;      // false
```

### Distributive behavior over unions

When the checked type is a "naked" type parameter, conditional types automatically distribute over each member of a union:

```ts
type ToArray<T> = T extends any ? T[] : never;

type Result = ToArray<string | number>; // string[] | number[], NOT (string | number)[]
```

TypeScript evaluates the conditional once per union member and unions the results back together - this distributive behavior is what makes `Exclude`/`Extract` work correctly on unions without special-casing.

### `infer` - extracting a type mid-expression

`infer` lets you introduce a new type variable inside the `extends` clause, capturing part of a matched type for use in the result:

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;

type A = ElementType<string[]>; // string
type B = ElementType<number[]>; // number
```

This is exactly how `ReturnType` and `Parameters` are actually implemented in TypeScript's standard library:

```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;

function getUser() { return { id: '1', name: 'nika' }; }
type User = MyReturnType<typeof getUser>; // { id: string; name: string }
```

And `Awaited`, handling nested Promises:

```ts
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;

type A = MyAwaited<Promise<Promise<string>>>; // string - recursively unwraps
```

### Interview question

**Q: What does `infer` do, and can you give a real built-in example that uses it?**

**Strong answer:**
> "`infer` lets you capture a piece of a type you're pattern-matching against inside a conditional type, and reuse that captured piece in the result branch. The clearest real example is `ReturnType<F>`, which is defined roughly as `F extends (...args: any[]) => infer R ? R : never` - it matches any function type and captures whatever its return type is into `R`, then returns `R`. I've used this in practice to derive a response DTO type directly from an existing service method's return type, so the two never drift out of sync - `type UserDto = Awaited<ReturnType<typeof userService.findById>>`."

### When conditional types are overkill

For day-to-day application code, hand-writing a conditional type from scratch is relatively rare - most of the value comes from *using* the built-ins (`Exclude`, `Extract`, `ReturnType`, `Awaited`, `NonNullable`) that are already built this way, or occasionally reaching for a small custom one when deriving a type from an existing function/API shape saves real duplication. Being able to explain how they work, though, is what proves depth versus "memorized the utility type names."

---

## 2. Mapped types

### Topics to learn
- [ ] Basic syntax: `{ [K in keyof T]: ... }`
- [ ] Modifiers: adding/removing `readonly` and `?` with `+`/`-` prefixes
- [ ] Key remapping with `as` (TS 4.1+) - renaming or filtering keys during mapping
- [ ] How `Partial`, `Required`, `Readonly`, `Pick`, `Record` are implemented as mapped types
- [ ] Combining mapped types with conditional types for advanced derivations

### Basic mapped type

```ts
type Flags<T> = {
  [K in keyof T]: boolean;
};

interface FeatureSet { darkMode: boolean; betaAccess: boolean; }
type FeatureFlags = Flags<FeatureSet>;
// { darkMode: boolean; betaAccess: boolean } - same keys, all values forced to boolean
```

### How the built-ins actually work

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };          // adds '?'
type MyRequired<T> = { [K in keyof T]-?: T[K] };         // removes '?'
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };  // adds 'readonly'
type MyMutable<T> = { -readonly [K in keyof T]: T[K] };  // removes 'readonly'
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };  // maps over a subset of keys
type MyRecord<K extends string | number | symbol, V> = { [P in K]: V };
```

Seeing these definitions is genuinely clarifying: `Partial<T>` isn't a special compiler builtin with magic behavior - it's a small, readable mapped type you could write yourself in one line.

### Key remapping with `as`

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

The `as` clause combined with template literal types lets you programmatically transform property names, not just their value types - this is how libraries generate typed getter/setter APIs or event-handler-name maps (`onClick`, `onChange`, etc.) from a base shape.

### Interview question

**Q: How would you implement `Readonly<T>` yourself, and what does the `readonly` modifier actually prevent?**

**Strong answer:**
> "`type MyReadonly<T> = { readonly [K in keyof T]: T[K] }` - it's a mapped type that iterates every key of `T` and re-declares it with a `readonly` modifier attached, keeping the same value type. At the type level, this prevents reassignment through that specific type reference - `obj.prop = x` becomes a compile error - but it's purely a compile-time guarantee; it does not freeze the object at runtime the way `Object.freeze` does. If you need actual runtime immutability, you need `Object.freeze` in addition to, or aligned with, the `readonly` type."

---

## 3. Declaration merging and module augmentation

### Topics to learn
- [ ] Interface declaration merging (recap from chapter 3, now with real use cases)
- [ ] Namespace merging with functions/classes/enums
- [ ] Module augmentation - adding to types from an already-imported module (`declare module 'express' { ... }`)
- [ ] Global augmentation - adding to global types (`declare global { interface Window { ... } }`)
- [ ] Real use case: extending Express's `Request` in NestJS after auth middleware attaches `user`

### The real-world use case: augmenting Express's `Request` in NestJS

```ts
// types/express.d.ts
import { User } from '../users/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

After an auth guard/middleware attaches `req.user = someUser`, every controller in the app can now write `@Req() req: Request` and access `req.user` with full type safety, without ever touching Express's own type definitions directly - TypeScript merges your `interface Request` declaration into the existing one from `@types/express`.

### Module augmentation example (a library's types, not global)

```ts
// augmenting a third-party module's exported interface
import 'some-library';

declare module 'some-library' {
  interface Config {
    myCustomOption?: boolean;
  }
}
```

This only works if the original declaration is also an `interface` (mergeable) - you cannot augment a `type` alias this way, which is one of the concrete, practical reasons library authors often expose configuration objects as `interface`s rather than `type`s.

### Interview question

**Q: You need `req.user` to be typed on every Express request after your auth guard runs, without touching `node_modules`. How?**

**Strong answer:**
> "Declaration merging via global augmentation - create a `.d.ts` file that does `declare global { namespace Express { interface Request { user?: User } } }`. TypeScript merges this into the existing `Request` interface from `@types/express` because interfaces with the same name in the same scope combine automatically. This is purely a compile-time addition - it doesn't change anything at runtime, so the actual `req.user = user` assignment still has to happen in real middleware/guard code; this just makes the compiler aware of it."

---

## 4. Typing React patterns precisely

### Topics to learn
- [ ] Component props typing: plain interface, `children` typing (`React.ReactNode`), optional/default props
- [ ] Generic components (e.g. a `<List<T>>` component)
- [ ] Typing `useState`, including the "widen vs narrow initial value" trap
- [ ] Typing `useReducer` with a discriminated union of actions
- [ ] Typing `useRef` for DOM nodes vs mutable value refs (the two different overloads)
- [ ] `forwardRef` generic typing
- [ ] Typing event handlers (`React.ChangeEvent<HTMLInputElement>`, etc.)

### Props and children

```tsx
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary'; // optional, union-constrained, not a loose string
  children?: React.ReactNode;
}

function Button({ label, onPress, variant = 'primary', children }: ButtonProps) {
  return <button onClick={onPress} className={variant}>{label}{children}</button>;
}
```

Using a union (`'primary' | 'secondary'`) instead of `string` for `variant` is a small but telling detail - it makes invalid values a compile error instead of a silent runtime string mismatch.

### Generic components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <>
      {items.map(item => <div key={keyExtractor(item)}>{renderItem(item)}</div>)}
    </>
  );
}

// Usage - T is inferred as User from the items array
<List items={users} renderItem={u => <span>{u.name}</span>} keyExtractor={u => u.id} />
```

### `useState` widening trap

```ts
const [status, setStatus] = useState('idle');
// inferred type is string, NOT 'idle' - so setStatus('anything') compiles fine,
// even though only 'idle' | 'loading' | 'success' | 'error' are actually valid

const [status2, setStatus2] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
// now setStatus2('anything') is a compile error - the type is explicit, not widened
```

TypeScript widens literal initial values passed to `useState` to their general primitive type by default, because otherwise reassigning to any other literal would be impossible - so for any state with a fixed, meaningful set of values, an explicit type parameter is required, not optional polish.

### `useReducer` with a discriminated union of actions

```ts
type State = { count: number };
type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { count: state.count + action.by };
    case 'decrement': return { count: state.count - action.by };
    case 'reset': return { count: 0 };
  }
}
```

This is the exact same discriminated-union pattern from chapter 3, applied to Redux-style reducers - `action.by` is only accessible in the branches where it actually exists on the type.

### `useRef`'s two overloads

```ts
const inputRef = useRef<HTMLInputElement>(null);
// type: RefObject<HTMLInputElement> - .current is read-only from the type's perspective
// (React sets it internally); typical use: DOM node access

const countRef = useRef(0);
// type: MutableRefObject<number> - .current is fully mutable by you;
// typical use: a mutable value that survives re-renders without triggering one
```

### Interview question

**Q: Why does `useState('idle')` sometimes cause a confusing type error later, and how do you fix it?**

**Strong answer:**
> "TypeScript infers the type from the initial value, and for a string literal like `'idle'` it widens the inferred type to plain `string` rather than the literal `'idle'` - otherwise you could never call the setter with any other value. That means if the intent was a small fixed set of states, nothing stops an invalid string from being set later, and the compiler won't catch it. The fix is to pass an explicit type parameter, `useState<'idle' | 'loading' | 'success' | 'error'>('idle')`, which locks the state to exactly the valid set and makes typos or invalid transitions a compile-time error."

---

## 5. Typing NestJS patterns precisely

### Topics to learn
- [ ] DTOs with `class-validator`/`class-transformer` decorators as the runtime+type source of truth
- [ ] Why Nest DTOs are classes, not plain `interface`/`type` (decorators require a real runtime construct)
- [ ] Generic services/repositories (recap, now end-to-end with validation)
- [ ] Custom parameter decorators with typed return values
- [ ] Guards/interceptors typing (`CanActivate`, `ExecutionContext`, `NestInterceptor`)
- [ ] `ConfigService` generic `get<T>()` typing patterns

### Why NestJS DTOs must be classes

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

`interface` and `type` are erased at compile time (chapter 3, section 1) - decorators like `@IsEmail()` need to attach metadata to something that **exists at runtime** so Nest's `ValidationPipe` can read it and actually validate incoming request bodies. A `class` compiles to a real JS constructor function that decorators can attach `reflect-metadata` to; an `interface` has nothing left to attach anything to. This is the concrete, mechanical reason - not convention - that DTOs are classes in Nest.

### Deriving response shapes safely

```ts
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  // passwordHash intentionally omitted - never expose it
}
```

Combined with a `ClassSerializerInterceptor` and `@Exclude()`/`@Expose()` from `class-transformer`, this pattern gives you both a compile-time DTO type and a runtime guarantee that sensitive fields are stripped before serialization - type safety alone (an `Omit<>` type) only protects you at compile time; it does nothing to stop an object with an actual `passwordHash` property from being JSON-serialized by mistake if the type is only enforced at the boundary and not runtime-stripped.

### Custom decorator with a typed return

```ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

@Get('me')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

The decorator factory's return type (`User`) flows through to the `@CurrentUser() user: User` parameter - this is why the decorator itself is typed to return `User`, not `any`, even though the underlying mechanism is just reading a property off the request object at runtime.

### Interview question

**Q: Why are NestJS DTOs written as classes instead of TypeScript interfaces?**

**Strong answer:**
> "Because validation decorators like `@IsEmail()` or `@MinLength()` need a real runtime target to attach metadata to via `reflect-metadata` - Nest's `ValidationPipe` reads that metadata at request time to actually validate the incoming body. Interfaces and type aliases are fully erased during compilation, so there's nothing left at runtime for a decorator to attach to. A class compiles down to an actual constructor function, which is why it's the only one of the three that can carry both the compile-time type checking and the runtime validation metadata simultaneously."

---

## 6. Strict mode, unpacked

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

## 7. Practical API DTO typing - end to end

### Topics to learn
- [ ] Single source of truth: entity type/class, then derive request/response types
- [ ] Request validation at the boundary (`class-validator` in Nest, `zod`/`yup` elsewhere)
- [ ] Response shape stripping sensitive fields (compile-time `Omit` + runtime `@Exclude()`/serializer)
- [ ] Keeping frontend and backend types in sync (shared types package, or codegen from OpenAPI/GraphQL schema) - awareness level
- [ ] Why "type the API response and trust it" is a common trap without runtime validation

### End-to-end example

```ts
// 1. Entity - source of truth
export class User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// 2. Request DTO - validated at the boundary
export class CreateUserDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

// 3. Response DTO - compile-time safe AND runtime-stripped
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  // no passwordHash field exists on this class at all
}

// 4. Service - maps entity to response DTO explicitly (never returns the raw entity)
@Injectable()
export class UsersService {
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await hash(dto.password);
    const user = await this.repo.save({ name: dto.name, email: dto.email, passwordHash });
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }
}
```

The key discipline: the **entity never leaves the service layer directly** - the controller/service always maps to an explicit response DTO, so a compile-time `Omit`-style intention (chapter 3) is backed by an actual runtime object that genuinely does not contain the sensitive field, rather than trusting a type annotation alone to "hide" a property that's still present on the real object at runtime.

### Interview question

**Q: Your `User` entity type says the response is `Omit<User, 'passwordHash'>`, but a bug still lets the password hash leak in a JSON response. How is that possible, and how do you prevent it structurally?**

**Strong answer:**
> "TypeScript types are erased at compile time and have zero effect on runtime behavior - `Omit<User, 'passwordHash'>` only changes what the compiler *thinks* the object's shape is; if the actual object returned still has a real `passwordHash` property on it, `JSON.stringify` or a serializer will happily include it, because nothing at runtime enforces the type. The structural fix is to construct an explicit new object (or DTO class instance) containing only the fields that should be exposed, rather than casting or type-asserting the original entity object down to a narrower type. In Nest specifically, combining that with `class-transformer`'s `@Exclude()` on the entity and a global `ClassSerializerInterceptor` adds a second, runtime-enforced layer of protection instead of relying on the type system alone."

---

## Full interview question bank (with answer targets)

### Conditional & mapped types
1. **What does `infer` do?** -> captures part of a matched type inside a conditional type for reuse in the result.
2. **Are conditional types distributive over unions?** -> yes, when the checked type is a bare type parameter.
3. **How is `Partial<T>` actually implemented?** -> a mapped type adding `?` to every key: `{ [K in keyof T]?: T[K] }`.
4. **What does the `as` clause in a mapped type let you do?** -> remap/rename/filter keys programmatically, often with template literal types.

### Declaration merging
5. **How do you add a custom property to Express's `Request` type in a Nest app?** -> global augmentation merging into `interface Request` via `declare global { namespace Express { ... } }`.
6. **Can you augment a `type` alias the way you augment an `interface`?** -> no, only interfaces support declaration merging.

### React typing
7. **Why does `useState('idle')` sometimes need an explicit type parameter?** -> literal widening infers plain `string`, allowing any string value; explicit union locks it down.
8. **How do you type a generic list component?** -> a generic function component `<T>` with `items: T[]`, `renderItem: (item: T) => ReactNode`.
9. **Two `useRef` overloads - what's the difference?** -> DOM-node ref (`RefObject`, read-only `.current` semantics) vs mutable value ref (`MutableRefObject`, freely mutable).

### NestJS typing
10. **Why are DTOs classes, not interfaces, in NestJS?** -> validation decorators need a real runtime target (via reflect-metadata); interfaces are erased.
11. **How do you stop a sensitive field from leaking in an API response, beyond just typing it away with `Omit`?** -> construct an explicit response object/DTO at runtime, plus `class-transformer` `@Exclude()` + serializer interceptor as defense in depth.

### Strict mode
12. **What is `strict: true` really?** -> a bundle enabling ~8 individual compiler flags.
13. **Which strict flag has the biggest real-world impact, and why?** -> `strictNullChecks` - eliminates silent `null`/`undefined` assignability almost everywhere.
14. **What does `strictPropertyInitialization` enforce?** -> class properties must be initialized in the constructor/at declaration, or explicitly marked as possibly undefined.

---

## Hands-on drills (do these)

- [ ] Implement `MyExclude<T, U>` and `MyExtract<T, U>` from scratch as conditional types and verify against a union of 3-4 types.
- [ ] Implement `DeepPartial<T>` as a recursive mapped type that makes nested object properties optional too, and test it against a 2-level-nested interface.
- [ ] Write a `.d.ts` file that augments Express's `Request` with a `user: User` property and use it in a mock Nest controller.
- [ ] Build a small generic `<Select<T>>` React component (`options: T[]`, `getLabel`, `getValue`, `onChange`) and use it with two different concrete types.
- [ ] Write a `useReducer` state machine (idle/loading/success/error) with a discriminated union of actions, including exhaustiveness checking in the reducer.
- [ ] Write `CreateUserDto`/`UpdateUserDto`/`UserResponseDto` classes with `class-validator` decorators for a small entity, then explain out loud why each is a class, not an interface.
- [ ] Turn `strictNullChecks` off in a `tsconfig.json` scratch project, write a function that crashes on `null`, and confirm it compiles; turn it back on and fix the resulting errors.

---

## Senior red flags / green flags

### Green flags interviewers love
- You can implement `Partial`/`Pick`/`Omit` from scratch as mapped types without hesitation.
- You use `infer` correctly in an example and connect it to `ReturnType`/`Awaited`.
- You know declaration merging is why NestJS's Express `Request` augmentation pattern works, mechanically, not just "that's how you do it."
- You catch the `useState` literal-widening trap before it's pointed out.
- You explain NestJS DTOs-as-classes via reflect-metadata and runtime existence, not "that's just the convention."
- You can name and justify at least 3 individual `strict` flags separately, not just "strict mode good."

### Red flags
- Cannot explain what `infer` does or has never used it, even at a reading level.
- Thinks utility types like `Partial`/`Omit` are special compiler magic rather than plain mapped types you could write yourself.
- Doesn't know why Nest DTOs are classes and guesses "just convention."
- Believes a compile-time `Omit<>` type alone prevents a sensitive field from ever appearing in a JSON response.
- Treats `strict: true` as an atomic on/off switch with no idea what's inside it.

---

## Tie-backs to your experience

- Deriving `UserResponseDto`/`CreateUserDto` from a single entity type, and defending why they're classes, is a direct, concrete NestJS talking point.
- The Express `Request` augmentation pattern is something you can point to as a real declaration-merging use case from backend auth work.
- Generic list/select components and `useReducer` state machines with discriminated unions map directly onto real React/RN screens (data tables, forms, async loading states).
- Defending `strictNullChecks` with a "this caught a real null-reference bug before production" story is a strong, credible senior answer if you have one from experience.

---

## Senior-Level Best Practices

### Decision frameworks & tradeoffs

**When a hand-written conditional/mapped type is worth the maintenance cost.** Custom type-level machinery (recursive conditional types, complex mapped types with `as` remapping) is powerful but has a real cost: it's harder for the next engineer to read, harder to debug when it produces a confusing error, and can slow down the compiler on large codebases. The senior default is to reach for a hand-written one only when it eliminates real, ongoing duplication (e.g., deriving a DTO from an entity so the two can never drift) - not for one-off cleverness. If a type is only ever used in one place and a plain, slightly-more-verbose type would be equally correct, prefer the plain version.

**Module augmentation vs. an explicit wrapper type.** Augmenting a third-party type (like Express's `Request`) is convenient but couples your codebase to that library's exact type structure and can silently conflict with another package that also augments the same interface. An explicit wrapper (e.g., a custom `AuthenticatedRequest extends Request { user: User }` type used only where you control the code, rather than global augmentation) is more verbose but avoids global mutation of a shared ambient type - the tradeoff is convenience/ubiquity (global augmentation) vs. isolation/explicitness (wrapper type). For a single, stable, team-wide pattern like Nest's auth `user` property, augmentation is the pragmatic industry-standard choice; for less universal or actively-evolving needs, prefer the wrapper.

**How strict to be with `strictPropertyInitialization` in DI-heavy NestJS code.** Constructor-parameter properties satisfy this flag naturally and are the preferred pattern. For properties genuinely set by a framework after construction (e.g., certain decorators, or fields set in a lifecycle hook like `onModuleInit`), a definite assignment assertion (`!`) is acceptable *only* when you can point to the exact mechanism that guarantees initialization before use - using `!` as a blanket "make the error go away" habit defeats the flag's entire purpose and should be treated as a code-review flag, not a routine pattern.

### Production checklists

- [ ] Every place a compile-time `Omit`-based DTO is used to "hide" a sensitive field also has a corresponding runtime guarantee (explicit object construction, or `class-transformer` `@Exclude()` + serializer interceptor) - never rely on the type alone for anything security-sensitive.
- [ ] Global/module augmentations (`declare global`, `declare module`) live in one discoverable location (e.g., a `types/` directory) with a comment explaining what attaches the augmented property at runtime, so a new engineer can find the actual assignment, not just the type declaration.
- [ ] `strict: true` is verified as actually enabled (not overridden per-file or per-directory via a looser nested `tsconfig.json`) across the entire codebase, including any monorepo packages.
- [ ] Recursive utility types (`DeepPartial`, `DeepReadonly`) have a documented recursion-depth/circular-reference consideration if used on types that could be self-referential, since naive recursive mapped types can hit TypeScript's recursion limits or produce `any` silently on deeply nested/circular structures.
- [ ] Generic React components/hooks exported from a shared UI library have their generic type parameters exercised by at least one non-trivial usage example in tests/stories, since generic inference bugs often only surface with real, varied call-site usage, not the simplest possible case.
- [ ] NestJS custom decorators that extract typed data from the request (`@CurrentUser()`, etc.) have their return type kept in sync with whatever actually attaches the underlying data (a guard/middleware) - verified with an integration test, not just a type assertion.

### Anti-patterns

- **Recursive conditional/mapped types written primarily to show off type-system depth**, used in application code where a simpler, slightly duplicated type would be more maintainable for the whole team. Type-system cleverness is a tool for solving a real duplication/safety problem, not a demonstration of skill that the rest of the team then has to maintain.
- **Relying on `declare module` augmentation to "patch" a genuinely wrong or outdated `@types` package** instead of fixing the underlying types issue (contributing a fix upstream, or pinning/patching the actual `.d.ts` via `patch-package`) - augmentation-as-patch works but silently diverges from what's actually published, confusing anyone who later checks the library's real type definitions.
- **DTO classes with validation decorators that also carry business logic methods** - mixing "this is a request shape with validation rules" and "this object also knows how to compute a derived value" bloats the DTO's responsibility and makes it harder to reason about what a DTO instance actually guarantees at any given point in the request lifecycle (validated vs. not yet validated).
- **Turning on `strict: true` for a large legacy codebase in one PR** and mass-suppressing the resulting hundreds of errors with `// @ts-expect-error` to make CI pass - this creates a wall of suppressions that's harder to ever clean up than the original unstrict codebase was, since now there's a false signal of "this file is strict-checked" that isn't actually true per-line.

### Failure modes

- **A sensitive field leaking despite an `Omit<>`-typed response**, because the actual runtime object returned still carries the field and nothing strips it before serialization - covered in the chapter, but worth stating as a *production* failure mode: this is a real, recurring class of security incident (accidentally including `passwordHash`, internal IDs, or other services' data in a JSON response) precisely because compile-time-only protection feels safer than it is.
- **A module augmentation silently stops applying after a dependency upgrade** changes the shape of the augmented interface (e.g., a new major version of `@types/express` restructures `Request`), and the augmented property (`req.user`) now conflicts or produces a confusing type error far from the actual dependency bump - a common, hard-to-diagnose type of breakage after routine `npm update`.
- **Generic component type inference breaking silently after a refactor** - moving a generic component's prop shape around, or wrapping it in another generic layer, can cause TypeScript to infer `unknown` or `never` instead of the expected type at call sites, with no obvious single point of failure - discovered as a wave of confusing downstream errors, not one clear one.
- **`strictNullChecks` catching real bugs that get suppressed under deadline pressure** rather than fixed - a rushed `!` non-null assertion added just to unblock a build, left in place indefinitely, silently reintroducing exactly the null-reference risk `strictNullChecks` was meant to eliminate.

### Observability

- Track TypeScript compiler error/warning counts (and `ts-expect-error`/non-null-assertion counts) as a dashboard metric over time when doing a strict-mode migration, so progress and regressions are visible to the whole team, not just felt anecdotally.
- For DTO-to-entity mapping code, add a lightweight runtime assertion or test that explicitly checks the *serialized* JSON output of a sensitive-entity response never contains a specific forbidden key (`passwordHash`, `internalNotes`, etc.) as a regression test - this catches the "type says it's safe but runtime isn't" gap directly, rather than relying on code review to notice.
- Log (at debug level, in non-production) when a module augmentation's expected runtime value is actually `undefined` at the point of use (e.g., `req.user` accessed but not set) - this surfaces a broken assumption (the middleware/guard didn't run, or ran in the wrong order) far earlier than a downstream `Cannot read properties of undefined` crash several layers deeper.

### Team/scale practices

- Keep a single, well-documented `types/` (or `@types/`) directory for all ambient/global augmentations in a codebase, reviewed with extra scrutiny in PRs, since these are genuinely global mutations to the type system that can conflict across packages in a monorepo.
- For a strict-mode migration on a legacy codebase, do it incrementally per-directory/package (using TypeScript's per-directory `tsconfig.json` overrides or the newer `strict` flag combined with a tracked exceptions list) rather than a single big-bang PR - this keeps each PR reviewable and avoids the mass-suppression anti-pattern above.
- Establish a team convention for where "derive from an existing type" (`Omit`/`Pick`/`ReturnType`) is mandatory vs. where a fresh, explicit type is preferred (e.g., public API contracts that should be stable even if the internal entity shape changes) - without this, some engineers will over-derive (coupling public contracts to internal implementation details) and others will under-derive (duplicating fields that then drift).

### Senior follow-up Q&A

**Q1: Your team wants to add `req.user` typing via global Express augmentation, but another dependency in the project also augments `Request` and the two conflict. How do you diagnose and resolve this?**
> "TypeScript's declaration merging combines all `interface Request` declarations in scope, so a conflict usually shows up as a type error where a property's type differs between the two augmentations (e.g., one declares `user?: User` and another declares `user: SomeOtherShape`), or as an unexpected type when reading `req.user`. I'd find every `declare global`/`declare module 'express'` augmentation in the dependency tree (including inside `node_modules/@types`) to see exactly what's being merged, then either align the conflicting shapes (if we control both), scope our augmentation more narrowly (a custom `AuthenticatedRequest` type used only in our own route handlers instead of globally augmenting `Request`), or as a last resort, use a type assertion at the specific boundary where we know our guard has run, accepting that as a documented, deliberate exception rather than a silent global conflict."

**Q2: Implement `DeepPartial<T>` and explain a case where it would misbehave or need special-casing.**
> Sketch: `type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;`. "This misbehaves on a few real shapes: arrays get their elements' properties made deeply partial, but the array type itself might need different handling (e.g., you may want `T[]` to stay `T[]` rather than becoming `Array<DeepPartial<T>>` in some use cases); class instances get mapped over their own properties structurally, which loses the class's methods/prototype in the resulting type; and `Date`/`RegExp`/other built-in objects get incorrectly treated as plain objects to recurse into rather than left alone, since `T extends object` is true for them too - a more robust version special-cases `T extends Date ? T : ...` and similar built-ins before recursing generically."

**Q3: Explain how you'd design a `Result<T, E>`-returning service layer in NestJS (instead of throwing exceptions) and how you'd type the eventual HTTP error mapping.**
> "Each service method returns `Promise<Result<T, E>>` (a discriminated union `{ ok: true, value: T } | { ok: false, error: E }`) instead of throwing for expected failure cases (validation failure, not-found, business-rule violation) - reserving actual thrown exceptions for truly unexpected errors. The controller layer then pattern-matches on the result: unwrapping `ok: true` into the HTTP response, and mapping specific `E` variants (via a discriminated union of error types, each with its own literal `code`) to the correct HTTP status codes and response shape - most naturally done through a small mapping function or Nest exception filter that understands the `Result` error union. The type-system payoff: the compiler forces every call site to handle both branches of `Result`, unlike exceptions, which can be silently un-caught and rely on runtime testing alone to verify coverage."

**Q4: A generic `<Table<T>>` React component's `columns` prop, typed as `{ key: keyof T; render: (row: T) => ReactNode }[]`, produces a confusing inference failure when a consumer passes columns for a nested field. How would you diagnose and potentially fix the type?**
> "`keyof T` only covers top-level keys, so a column wanting to render a nested field (`row.address.city`) can't express `key` as a valid `keyof T` at all - the type is too restrictive for that use case, and the resulting error is usually a confusing 'string is not assignable to keyof T' rather than a clear 'nested keys aren't supported.' I'd either extend the column type to accept an accessor function instead of/alongside a `keyof T` key (`accessor: (row: T) => unknown` in addition to `render`), which sidesteps the nested-key problem entirely, or introduce a typed dot-path utility type if nested-key-as-string access is a genuinely common need across many tables - weighing that against the added type complexity from the earlier decision framework."

**Q5: Why might `strictFunctionTypes` (one of the less-discussed `strict` sub-flags) matter for a callback-heavy NestJS interceptor or guard implementation?**
> "`strictFunctionTypes` enforces contravariant checking of function parameter types - roughly, a function expecting a narrower parameter type can't be safely substituted where a function expecting a wider one is required, because the narrower one might not handle all inputs the wider contract promises. In a guard/interceptor context, this catches a real class of bugs where an interface expects a handler accepting a general `ExecutionContext`-derived type, but an implementation is typed to accept only a more specific subtype - without this flag, TypeScript would unsoundly allow substituting it, and at runtime the handler could receive a shape it doesn't actually support, causing a crash NestJS's own type-checking should have caught at compile time."

**Q6: How would you structure a shared `packages/types` workspace in a monorepo so that both a NestJS backend and a React frontend consume the same request/response types, while still letting the backend attach validation decorators?**
> "I'd keep the pure structural shapes (plain interfaces or types with no decorators - the 'wire format') in the shared package, since decorators like `class-validator`'s require a real class and pulling `class-validator` into a frontend bundle is unnecessary bloat. The backend then defines its actual validated DTO classes as `implements SharedUserRequestShape` (or similar), getting both the shared structural contract and its own decorator-based runtime validation, while the frontend imports only the plain shared type with zero added runtime dependency. This keeps the single source of truth for the *shape* shared, while letting each side add the runtime behavior (validation on the backend, maybe form-schema validation on the frontend) that's actually relevant to it."

---

## Mastery checklist

- [ ] I can write a basic conditional type with `infer` and explain a real built-in that uses the same pattern.
- [ ] I can implement at least 2 utility types from chapter 3 as mapped types from scratch.
- [ ] I can explain declaration merging via the Express `Request` augmentation example end to end.
- [ ] I can type a generic React component and a `useReducer` state machine correctly.
- [ ] I can explain, mechanically, why NestJS DTOs must be classes.
- [ ] I can name and individually justify at least 4 flags inside `strict: true`.
- [ ] I can design an entity -> request DTO -> response DTO typing strategy and explain the runtime-safety gap that types alone don't close.
