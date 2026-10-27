# TS02 — Advanced patterns

### TS-051 — Conditional types basics

**Difficulty:** Senior

**Category:** Conditional types

**Question:**

What is a conditional type, and when do you reach for one?

**Answer:**

A conditional type has the form `T extends U ? X : Y`. It chooses a type based on a relationship. Useful for library APIs: unwrap promises, pick success branches, or change return types by input. In app code, prefer simpler unions unless you are building reusable utilities. Example: `type IsString<T> = T extends string ? true : false`. Keep them readable—nesting quickly becomes interview-hostile.

**Follow-up:**

Where do conditional types show up in built-ins?

Answer: `Exclude`, `Extract`, `NonNullable`, and `ReturnType` are built on them.

### TS-052 — Distributive conditional types

**Difficulty:** Senior

**Category:** Conditional types

**Question:**

Why do conditional types distribute over unions, and how do you stop that?

**Answer:**

When the checked type is a naked type parameter, `T extends U ? X : Y` applies per union member. That powers `Exclude`. To disable distribution, wrap in a tuple: `[T] extends [U] ? X : Y`. You need this when you want to test the whole union as one. Misunderstanding distribution causes surprising `never` results in utility types.

**Follow-up:**

Give a case where non-distributive behavior is required.

Answer: Testing whether an entire union is assignable to a target, not each member.

### TS-053 — infer keyword

**Difficulty:** Senior

**Category:** Conditional types

**Question:**

How does `infer` work inside conditional types?

**Answer:**

`infer` introduces a new type variable in the true branch: `T extends Promise<infer U> ? U : T`. Used to unpack return types, array elements, function args, and nested structures. Classic interview example: unwrap API response wrappers. Prefer `Awaited` or `ReturnType` when they already solve the problem—write custom `infer` for domain-specific shapes.

**Follow-up:**

Can you use multiple infer positions in one extends clause?

Answer: Yes—e.g. inferring both args and return from a function signature.

### TS-054 — Mapped types

**Difficulty:** Senior

**Category:** Mapped types

**Question:**

What are mapped types, and how do they relate to Partial?

**Answer:**

Mapped types transform each property: `{ [K in keyof T]: ... }`. `Partial`, `Readonly`, `Pick`, and many custom utilities are mapped types. You can add modifiers like `?` or `readonly`, or remove them with `-?` and `-readonly`. Use them to derive form state from models or make all DTO fields optional for PATCH. Keep recursion depth and readability in mind.

**Follow-up:**

How do you make all properties required with a mapped type?

Answer: `{ [K in keyof T]-?: T[K] }` which is what `Required` does.

### TS-055 — Key remapping with as

**Difficulty:** Senior

**Category:** Mapped types

**Question:**

How does key remapping in mapped types work?

**Answer:**

In modern TypeScript, `as` inside mapped types renames or filters keys: `{ [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K] }`. Filtering uses `never` as the remapped key. Powerful for generating getters, stripping prefixes, or building event handler maps for React. Prefer simpler Pick/Omit when remapping is overkill.

**Follow-up:**

How do you omit keys whose values are functions via remapping?

Answer: Remap those keys to `never` using a conditional on `T[K]`.

### TS-056 — Template literal types

**Difficulty:** Senior

**Category:** Template literal types

**Question:**

When are template literal types worth using in application code?

**Answer:**

They build string unions from parts: `` `on${Capitalize<EventName>}` `` for React-like handler names, or route patterns like `` `/users/${string}` ``. Great for typed CSS-ish tokens or event buses. Avoid encoding full grammars—complexity skyrockets. For APIs, use them when string formats are closed and important; otherwise validate with schemas.

**Follow-up:**

How do intrinsic string utilities help?

Answer: `Uppercase`, `Lowercase`, `Capitalize`, and `Uncapitalize` transform literal string types.

### TS-057 — Recursive types carefully

**Difficulty:** Staff

**Category:** Advanced type design

**Question:**

When do recursive types help, and what are the risks?

**Answer:**

They model trees, nested JSON, or DeepPartial/DeepReadonly. TypeScript has recursion limits; overly clever types slow the compiler and confuse teammates. Prefer schema libraries for deep JSON validation. If you write DeepReadonly, constrain depth or keep it internal to a shared util package with tests for compile behavior.

**Follow-up:**

What symptom suggests a recursive type is too heavy?

Answer: Extremely slow editor checks or “type instantiation is excessively deep” errors.

### TS-058 — Branded / nominal types

**Difficulty:** Senior

**Category:** Advanced type design

**Question:**

How do branded types prevent mixing IDs of different entities?

**Answer:**

Intersect a primitive with a unique brand: `type UserId = string & { readonly __brand: 'UserId' }`. Functions accept `UserId`, not any string. At runtime it’s still a string—branding is compile-time only. Ideal for React routes and Nest handlers that must not swap orderId and userId. Create helpers that validate then brand after parsing.

**Follow-up:**

How do you create a branded value safely?

Answer: Validate format, then assert or return through a factory that produces the branded type.

### TS-059 — Opaque results and API error modeling

**Difficulty:** Senior

**Category:** Type-safe API responses

**Question:**

How would you model typed API errors across React and Node?

**Answer:**

Use a discriminated union of error codes with payloads: `{ code: 'NOT_FOUND' } | { code: 'VALIDATION'; fields: Record<string, string> }`. Services return `Result<T, ApiError>`. HTTP layer maps codes to status. React switches on `code` for UX. Avoid `Error` alone—it loses structure. Share the error union in a common package.

**Follow-up:**

Why not throw for every domain failure?

Answer: Expected failures are part of control flow; typed Results make handling explicit and exhaustible.

### TS-060 — Type-safe event emitters

**Difficulty:** Senior

**Category:** Advanced type design

**Question:**

How do you type an event map so emit/on stay in sync?

**Answer:**

Define `type Events = { userCreated: { id: string }; orderPaid: { orderId: string } }` then `on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void)`. Emit uses the same constraint. Works for Node EventEmitter wrappers and React micro-bus patterns. Prevents wrong payload shapes per event name.

**Follow-up:**

How do you type once vs on with the same map?

Answer: Share a private helper type for the handler signature keyed by event.

### TS-061 — Variance: covariance and contravariance intuition

**Difficulty:** Staff

**Category:** Functions & assignability

**Question:**

Explain variance for function parameters and return types in TypeScript terms.

**Answer:**

Return types are covariant: a function returning `Dog` can be used where `Animal` is expected if Dog extends Animal. Parameters are contravariant under strictFunctionTypes: a handler accepting `Animal` can replace one accepting `Dog`, not reverse. Method syntax can be bivariant for historical React reasons. Understanding this explains unsafe callback assignments and event handler typing debates.

**Follow-up:**

Why are readonly arrays covariant in practice compared to mutable arrays?

Answer: Mutating through a widened alias is unsafe; readonly removes write positions.

### TS-062 — Typing higher-order React components

**Difficulty:** Senior

**Category:** React patterns

**Question:**

How do you type an HOC that injects props?

**Answer:**

Generic over the wrapped component props, Omit the injected keys from required props, and return a component that accepts the remaining props. Preserve statics carefully if needed. Prefer hooks over HOCs in modern React, but interviews still ask. Example: inject `theme`, so outer props are `Omit<P, 'theme'>`. Avoid `any` on the wrapped component.

**Follow-up:**

What breaks if you don’t Omit injected props?

Answer: Callers must pass props they shouldn’t, or types disagree with runtime.

### TS-063 — Polymorphic React components

**Difficulty:** Senior

**Category:** React patterns

**Question:**

How do you type a polymorphic `as` prop component?

**Answer:**

Generic over the element type: `type BoxProps<T extends ElementType> = { as?: T } & ComponentPropsWithoutRef<T>`. Default `T` to `'div'`. This merges intrinsic attributes correctly for `as="a"` vs `as="button"`. It’s advanced—document examples. Many design systems use this pattern; keep constraints so `as` cannot be an incompatible component.

**Follow-up:**

Why use ComponentPropsWithoutRef instead of ComponentProps?

Answer: To avoid pulling in ref in a way that conflicts with your own ref forwarding strategy.

### TS-064 — Typing forwardRef

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you correctly type `forwardRef`?

**Answer:**

`forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) { ... })`. First type param is the ref instance type; second is props. With React 19, ref-as-prop changes patterns—know your version. Don’t use `any` for ref. For polymorphic components, ref typing gets harder and often needs extra generics.

**Follow-up:**

What is a common mistake with forwardRef generics order?

Answer: Swapping ref type and props type parameters.

### TS-065 — Discriminated props in React

**Difficulty:** Senior

**Category:** React patterns

**Question:**

How can discriminated unions improve component props?

**Answer:**

Model mutually exclusive props as a union: `{ mode: 'single'; value: string } | { mode: 'multiple'; value: string[] }`. Then the component cannot receive inconsistent combinations. Better than optional pairs that allow illegal states. Same idea as UI state machines. Keeps IntelliSense honest for consumers.

**Follow-up:**

How do you add shared props to each variant?

Answer: Intersect a base props type with each union member.

### TS-066 — Exhaustiveness in reducers

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type a useReducer action/reducer pair for exhaustiveness?

**Answer:**

Define actions as a discriminated union. In the reducer switch, handle each `type` and end with `const _exhaustive: never = action`. Adding a new action forces a compile error until handled. State can also be a discriminated union. This scales better than stringly-typed actions in large React features.

**Follow-up:**

Should action payloads be optional fields or separate variants?

Answer: Separate variants—optional payloads allow wrong combinations.

### TS-067 — Typing context without default lies

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type React context when there is no sensible default?

**Answer:**

Create context with `undefined`, then a hook that throws if missing: `const value = useContext(Ctx); if (!value) throw new Error(...)`. Return a narrowed value. Avoid `{} as ContextValue` defaults that hide missing providers. For Node-unrelated UI trees, this pattern is standard and interview-friendly.

**Follow-up:**

When is a default context value acceptable?

Answer: When a real no-op or theme fallback is meaningful at runtime.

### TS-068 — Generic repository pattern on the backend

**Difficulty:** Senior

**Category:** Backend patterns

**Question:**

How would you type a generic repository without fighting the ORM?

**Answer:**

Constrain the entity: `T extends { id: Id }`. Methods like `findById(id: Id): Promise<T | null>` and `create(data: CreateInput<T>): Promise<T>`. Prefer composing with Prisma-generated types over reinventing query builders. Keep API-facing methods returning DTOs, not full entities. Generics help shared CRUD; complex queries stay specific.

**Follow-up:**

Why might a fully generic repository become a trap?

Answer: Domain queries differ; forced generics hide real constraints and invite any.

### TS-069 — Middleware typing in Express

**Difficulty:** Senior

**Category:** Backend patterns

**Question:**

How do you type middleware that augments the request?

**Answer:**

Define an extended interface: `interface AuthedRequest extends Request { user: User }`. Auth middleware validates the session, assigns `user`, then calls next. Downstream handlers accept `AuthedRequest`. Alternatively use generics/helpers that encode “after auth.” Avoid asserting on every handler. Pair with runtime checks—types don’t enforce middleware order alone.

**Follow-up:**

How can type-safe middleware chains be modeled more strictly?

Answer: Use generic Request transforms or libraries that thread augmented types through handlers.

### TS-070 — Validation layer and type inference

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

How should validation libraries interact with TypeScript inference?

**Answer:**

Prefer schema-first: define Zod/Yup/io-ts schema, infer the type. That keeps runtime and static types coupled. Nest class-validator is class-first with decorators—still useful, but inference is weaker. At boundaries, never trust client input because the type says so. Use inferred types in React forms and Express handlers alike.

**Follow-up:**

What is z.infer used for?

Answer: Extracting a static TypeScript type from a Zod schema.

### TS-071 — Conditional types for function overloads alternatives

**Difficulty:** Senior

**Category:** Conditional types

**Question:**

How can conditional types replace some overload sets?

**Answer:**

A single generic signature can return different types via `T extends A ? X : Y`. Example: if input is an array, return array; else return single. This keeps one implementation signature. Overloads can still be clearer for humans. Choose readability for app code; conditional returns shine in shared utilities.

**Follow-up:**

When do overloads remain clearer?

Answer: When input/output pairs are few and documentation-oriented.

### TS-072 — Extracting promise and generator types

**Difficulty:** Senior

**Category:** Conditional types

**Question:**

How would you unwrap nested async types in a custom util?

**Answer:**

Use `Awaited` first. For custom wrappers like `ApiResponse<T>`, write `T extends ApiResponse<infer U> ? U : T`. Chain carefully. In React Query-like helpers, infer data from fetcher return types. Don’t reinvent Awaited. Test with Promise, thenable, and non-promise inputs so distribution behaves as expected.

**Follow-up:**

Why test non-promise inputs?

Answer: To ensure the util is identity on plain values and doesn’t produce never.

### TS-073 — Path mapping and project references awareness

**Difficulty:** Intermediate

**Category:** Tooling & config

**Question:**

What TypeScript project setup issues show up in full-stack monorepos?

**Answer:**

Path aliases must match bundler and runtime resolvers. Project references help build shared packages incrementally. React and Nest may need different `module`/`moduleResolution` settings. Prefer exporting types from built `dist` or using a shared TS project. Interviews care that you know types and runtime resolution can diverge.

**Follow-up:**

What breaks if only TypeScript knows an alias?

Answer: Runtime or test runners fail to resolve the import.

### TS-074 — ModuleResolution bundler vs Node

**Difficulty:** Intermediate

**Category:** Tooling & config

**Question:**

Why does moduleResolution matter for a React/Vite vs Node API project?

**Answer:**

Bundler resolution mirrors modern bundlers and is friendlier for frontend. Node16/NodeNext enforces ESM/CJS realities—extensions, exports maps. A shared package consumed by both needs careful exports. Wrong settings cause phantom type successes that fail at runtime. Align tsconfig with how the code actually runs.

**Follow-up:**

Why might NodeNext require .js extensions in TypeScript imports?

Answer: Emit and ESM resolution expect the runtime specifier shape.

### TS-075 — Typing process.env

**Difficulty:** Intermediate

**Category:** Backend patterns

**Question:**

How do you type environment variables safely in Node?

**Answer:**

Don’t sprinkle `process.env.FOO!`. Parse env at startup with a schema into a typed config object. Fail fast on missing secrets. For React, distinguish build-time `import.meta.env` from server secrets—never leak server env to the client. Provide a single `config` import so the rest of the app sees booleans and strings correctly typed.

**Follow-up:**

Why is ambient ProcessEnv augmentation weaker than parsing?

Answer: It doesn’t validate presence or format at runtime.

### TS-076 — Narrowing with assertion functions

**Difficulty:** Senior

**Category:** Type guards & narrowing

**Question:**

What is an assertion function, and when is it useful?

**Answer:**

`function assert(condition: unknown): asserts condition` narrows after the call by throwing if false. `asserts value is string` narrows the value. Useful in Nest/Express guards and shared assert helpers. Unlike predicates, assertion functions don’t return boolean—they guarantee by control flow. Keep them honest or you create false safety.

**Follow-up:**

How does this differ from a type predicate?

Answer: Predicates return boolean for branching; assertions throw and narrow on success.

### TS-077 — this parameter typing

**Difficulty:** Senior

**Category:** Functions & assignability

**Question:**

How does the fake `this` parameter work in TypeScript?

**Answer:**

The first parameter named `this` types the call context and erases from emit. Useful for methods extracted from classes or fluent builders. In React class components it’s less common now; in Node ORMs or older codebases it still appears. Arrow functions don’t bind their own this, so the feature mainly applies to function declarations/methods.

**Follow-up:**

Does specifying `this` change runtime binding?

Answer: No—it only checks calls; runtime this still depends on how the function is called.

### TS-078 — Covariance of promises and arrays pitfalls

**Difficulty:** Staff

**Category:** Functions & assignability

**Question:**

What assignability pitfalls do mutable arrays create?

**Answer:**

TypeScript allows some array assignments that can be unsafe if you push the wrong subtype later. Prefer `readonly T[]` for inputs you won’t mutate. For Promises, returning a more specific type is fine. In React state, storing a widened array type can lose literal information—use const assertions or generic state. Know the classic “push apple into Fruit[] aliased as Banana[]” discussion.

**Follow-up:**

How do you protect function inputs from mutation?

Answer: Accept `readonly T[]` so callers with mutable arrays still pass, but you can’t push.

### TS-079 — Typing CSS modules and assets

**Difficulty:** Junior

**Category:** Modules & declarations

**Question:**

How do you type CSS module imports in a React TypeScript app?

**Answer:**

Add a declaration: `declare module '*.module.css' { const classes: Record<string, string>; export default classes }`. More precise tools can generate class names. Without it, imports error under strict module settings. Same pattern for SVG/PNG depending on the bundler. Keep declarations aligned with actual bundler behavior.

**Follow-up:**

Why might Record<string, string> be weaker than generated types?

Answer: It allows any class name string, including typos.

### TS-080 — Satisfies vs as const for config maps

**Difficulty:** Intermediate

**Category:** Type inference

**Question:**

How do `satisfies` and `as const` work together for route or feature configs?

**Answer:**

`as const` locks literals and readonly-ness. `satisfies` ensures the object matches a broader contract like `Record<string, Handler>`. Combining them yields precise keys/values while validating structure. Excellent for Express route tables and React feature flags. Annotation alone often widens literals; assertion alone skips checks.

**Follow-up:**

What do you lose if you only use a type annotation on the object?

Answer: Literal key/value narrowing often widens to string or general function types.

### TS-081 — Building DeepPartial

**Difficulty:** Senior

**Category:** Mapped types

**Question:**

How would you implement DeepPartial, and when should you not?

**Answer:**

Map each property to a recursive Partial, special-casing arrays and builtins carefully. It’s useful for nested PATCH bodies and test factories. Skip it if your validation schema already defines partial nested shapes. Watch for functions and Dates—deep-partialing everything can produce nonsense. Prefer schema-driven partials for API inputs.

**Follow-up:**

How do you stop DeepPartial from transforming arrays into objects incorrectly?

Answer: Detect arrays and map to DeepPartial of the element type as an array.

### TS-082 — Type predicates with array filter

**Difficulty:** Intermediate

**Category:** Type guards & narrowing

**Question:**

How do type predicates improve `array.filter`?

**Answer:**

`items.filter((x): x is User => x != null)` narrows the result to `User[]`. Without a predicate, filter often leaves `(User | null)[]`. Critical when normalizing Prisma-ish nullable joins or React lists. Keep the predicate correct—TypeScript won’t verify your runtime logic beyond the signature.

**Follow-up:**

Does Boolean as a callback narrow correctly?

Answer: Not reliably for type predicates; use an explicit `x is T` predicate.

### TS-083 — Const type parameters

**Difficulty:** Senior

**Category:** Generics

**Question:**

What are const type parameters, and why help inference?

**Answer:**

`function f<const T>(...): ...` asks TypeScript to infer literal/readonly types similarly to `as const`. Useful for typed route builders, tuple inference, and React prop helpers that need literal unions. Reduces forced `as const` at call sites. Know it’s a newer feature—mention gracefully in interviews.

**Follow-up:**

When would you still ask callers to use as const?

Answer: When targeting older TypeScript versions without const type parameters.

### TS-084 — NoInfer and inference control

**Difficulty:** Staff

**Category:** Generics

**Question:**

How do you stop unwanted type inference from a type parameter position?

**Answer:**

Use `NoInfer<T>` in positions that shouldn’t drive inference, so another argument decides T. Classic in React component libraries and styled APIs where defaults were fighting user intent. Before NoInfer, people used circular constraints or extra dummy parameters. Mentioning NoInfer signals modern TS fluency.

**Follow-up:**

What problem does NoInfer solve for defaulted generics?

Answer: Prevents a wide default from being inferred from a secondary argument incorrectly.

### TS-085 — Typing error boundaries and fallback props

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type an error boundary fallback that receives an error?

**Answer:**

Type fallback as `React.ComponentType<{ error: Error; reset: () => void }>` or a render prop with the same shape. Keep `error` as `unknown` if you don’t control throw sites, then narrow. Class error boundaries have specific lifecycle typings. Don’t assume every thrown value is `Error`—in Node and UI code, anything can be thrown.

**Follow-up:**

Why might typing thrown values as Error be dishonest?

Answer: People throw strings or objects; unknown then narrow is safer.

### TS-086 — Safe indexing patterns

**Difficulty:** Intermediate

**Category:** Object types

**Question:**

How do you index objects and arrays safely under strict settings?

**Answer:**

With `noUncheckedIndexedAccess`, expect `T | undefined`. Check before use. For dictionaries, `Map` often beats index signatures. For React lists, prefer `.map` over manual index access. When you know a key exists from a prior `in` check or literal key, narrowing helps—but computed keys may still be unsafe.

**Follow-up:**

Why are Maps often clearer than string index signatures?

Answer: Missing keys are explicitly undefined via get, and keys aren’t mixed with prototype concerns.

### TS-087 — Dual packages and types versions

**Difficulty:** Senior

**Category:** Tooling & config

**Question:**

What issues arise shipping TypeScript types for a library used by React and Node?

**Answer:**

Need correct `types`/`exports` in package.json, ESM/CJS dual publish care, and dependency on `typescript` as peer when using namespaces. Avoid referencing DOM types in a Node-oriented package or vice versa without environments. Versioning types with API changes matters—breaking type changes break consumers even if JS runs.

**Follow-up:**

What is the risk of depending on @types/node in a universal package?

Answer: Consumers get Node globals unexpectedly in frontend typechecking.

### TS-088 — Using never for impossible states

**Difficulty:** Intermediate

**Category:** any / unknown / never

**Question:**

How do you design types so illegal states are never representable?

**Answer:**

Prefer unions over booleans: don’t allow `{ isLoading: true, data: User }` and `{ isLoading: false, data: null }` chaos via independent fields. Encode valid combinations only. Same for backend command results. This is “make illegal states unrepresentable,” a high-value senior talking point with React and API models.

**Follow-up:**

Give a boolean pair that should become a union.

Answer: `isError` and `isSuccess` replaced by a status discriminant.

### TS-089 — Intersection of functions and overloads

**Difficulty:** Staff

**Category:** Unions & intersections

**Question:**

What happens when you intersect or union function types?

**Answer:**

Union of parameters becomes an intersection for calls (you must satisfy all), which surprises people. Intersecting call signatures produces overloads. This matters when composing middleware types or React prop callbacks from multiple sources. If handler types go weird, simplify to one explicit function type instead of composing accidentally.

**Follow-up:**

Why can a union of functions be hard to call?

Answer: Arguments must be assignable to every function’s parameters.

### TS-090 — Typing SQL/query builders lightly

**Difficulty:** Senior

**Category:** Backend patterns

**Question:**

How do you keep query results typed without a full ORM?

**Answer:**

Use a query builder with generics, or map raw rows through a schema. For each query, define a result interface and validate in development or at the boundary. Branded column names help. Don’t cast large row arrays as trusted domain objects. Prisma-like inference is ideal; without it, schema.parse on rows is pragmatic.

**Follow-up:**

What is the danger of `as User[]` on query results?

Answer: Schema drift fails silently until production bugs appear.

### TS-091 — Progressive adoption strategies

**Difficulty:** Intermediate

**Category:** Tooling & config

**Question:**

How do you migrate a JS React/Node codebase to TypeScript safely?

**Answer:**

Enable `allowJs`, start at boundaries, turn on `strict` per package gradually, replace `any` with `unknown`, and add schemas for IO. Avoid widespread assertions to “finish” typing. Generate types from OpenAPI/Prisma when possible. Measure with `noImplicitAny` hotspots. Keep shipping features—typing should reduce risk, not freeze delivery.

**Follow-up:**

Why type API boundaries before deep internals?

Answer: Boundaries catch the expensive bugs; internals can infer once inputs are sound.

### TS-092 — Type-safe routing params

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type route parameters in a React app?

**Answer:**

Use your router’s generic APIs when available (params object typed from the path). If not, validate params with a schema on entry to the page. Brand IDs after validation. Avoid assuming `useParams()` is a fully trusted string map—values can be undefined. Share route path constants typed with template literals if the router supports it.

**Follow-up:**

Why validate route params if TypeScript already types them?

Answer: Runtime can still supply missing/malformed values; types don’t execute.

### TS-093 — Differentiating null and undefined in APIs

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

How should APIs treat null vs undefined in TypeScript models?

**Answer:**

Pick a convention: JSON uses null for empty; omit fields for undefined when serializing. Reflect that in types—don’t casually union both everywhere. For PATCH, missing means “leave unchanged,” null may mean “clear.” Document and validate. React forms should know which one the API expects to avoid accidental clears.

**Follow-up:**

How does JSON.stringify treat undefined object properties?

Answer: It omits them, while null is emitted as null.

### TS-094 — Utility type: Uppercase keys mapper example

**Difficulty:** Senior

**Category:** Mapped types

**Question:**

Walk through designing a type that uppercases all keys of an object type.

**Answer:**

Use key remapping: `{ [K in keyof T as Uppercase<K & string>]: T[K] }`. Intersect keys with string to satisfy template utilities. Mention symbol keys need care. This demonstrates mapped types plus template literals—common staff-level exercise. In apps, such types are rare; in libraries, more common.

**Follow-up:**

How would you also deep-transform nested objects?

Answer: Recurse with a conditional: objects map deeply, primitives stay as-is.

### TS-095 — Standard Schema / shared contracts mindset

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

What do you look for in a shared contract between React and a Node API?

**Answer:**

One source of truth for payloads: OpenAPI, shared Zod schemas, or generated clients. Versioning strategy, error shape consistency, and branding of IDs. Types alone aren’t a contract—runtime compatibility matters. Prefer generating React hooks/clients from the same contract the Nest/Express server validates.

**Follow-up:**

What breaks when only TypeScript interfaces are shared?

Answer: No runtime validation; server and client can still disagree at runtime.

### TS-096 — Typing websockets or SSE messages

**Difficulty:** Senior

**Category:** Type-safe API responses

**Question:**

How would you type a websocket message protocol?

**Answer:**

Discriminated union on `type` with payloads per message. Shared between server and React client. Validate on receive because socket data is untrusted. Keep version field for evolution. Handler maps: `Record<Message['type'], ...>` with careful extract patterns, or switch exhaustively. Avoid a single `any` data blob.

**Follow-up:**

How do you handle unknown future message types?

Answer: Include a fallback, log, and use never checks only on the known union version.

### TS-097 — Performance of types in large codebases

**Difficulty:** Staff

**Category:** Tooling & config

**Question:**

What makes TypeScript slow in large full-stack monorepos, and what do you do?

**Answer:**

Huge unions, deep recursion, excess mapped conditionals, and poorly bounded generics. Fix by simplifying public types, using project references, avoiding exporting complex inferred types, and preferring interfaces for frequent object shapes when it helps. Measure with extended diagnostics. Clever types that save three lines but cost editor lag are a bad trade.

**Follow-up:**

Why can exporting inferred giant types hurt consumers?

Answer: Downstream projects must re-evaluate expensive types repeatedly.

### TS-098 — Class vs interface for domain models

**Difficulty:** Intermediate

**Category:** Interfaces & type aliases

**Question:**

When should a domain model be a class instead of an interface?

**Answer:**

Use classes when you need runtime behavior, instanceof, or Nest DTO validation metadata. Use interfaces/types for pure data crossing React and API boundaries. Don’t add classes just for typing—erasure means interfaces are cheaper. Hybrid: validate into a plain typed object unless methods are real.

**Follow-up:**

What is the emit cost of interfaces vs classes?

Answer: Interfaces emit nothing; classes emit JavaScript constructor code.

### TS-099 — Pattern: parsed vs raw request types

**Difficulty:** Senior

**Category:** Backend patterns

**Question:**

How do you separate raw HTTP input types from parsed domain types?

**Answer:**

Raw: strings from query/headers, unknown body. Parsed: branded IDs, numbers, enums after validation. Handlers downstream accept only parsed types so they can’t forget validation. In Express/Nest, middleware or pipes perform the jump. In React, form string state vs submitted domain payloads follow the same idea.

**Follow-up:**

Why keep both types instead of one loose type?

Answer: It encodes whether validation already happened in the type system.

### TS-100 — Staff-level judgment: when not to be clever

**Difficulty:** Staff

**Category:** Advanced type design

**Question:**

How do you decide when advanced TypeScript is not worth it?

**Answer:**

If a type takes longer to understand than the runtime code, simplify. Prefer clear unions, validation at boundaries, and a few generics over deep conditional graphs. Optimize for teammate fluency and compiler performance. Advanced features belong in well-tested shared utilities, not sprinkled through feature code. Seniors are judged on judgment, not type Tetris.

**Follow-up:**

What is a good default for application feature code?

Answer: Explicit domain unions, schemas at IO, light generics, and almost no recursive conditionals.
