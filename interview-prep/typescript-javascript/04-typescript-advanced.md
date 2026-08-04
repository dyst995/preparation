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

## Mastery checklist

- [ ] I can write a basic conditional type with `infer` and explain a real built-in that uses the same pattern.
- [ ] I can implement at least 2 utility types from chapter 3 as mapped types from scratch.
- [ ] I can explain declaration merging via the Express `Request` augmentation example end to end.
- [ ] I can type a generic React component and a `useReducer` state machine correctly.
- [ ] I can explain, mechanically, why NestJS DTOs must be classes.
- [ ] I can name and individually justify at least 4 flags inside `strict: true`.
- [ ] I can design an entity -> request DTO -> response DTO typing strategy and explain the runtime-safety gap that types alone don't close.
