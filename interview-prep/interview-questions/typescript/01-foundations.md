# TS01 — Foundations

### TS-001 — Structural typing vs nominal typing

**Difficulty:** Intermediate

**Category:** Type system basics

**Question:**

How does TypeScript’s structural typing differ from nominal typing, and why does that matter in interviews?

**Answer:**

TypeScript checks shape, not declared name. If two types have the same properties, they are assignable even if they came from different interfaces. That surprises people from Java or C#. In practice, an API response typed as `{ id: string }` can satisfy a React prop expecting the same fields. Be careful: accidental extra compatibility can hide bugs, so use branded types or unique symbols when identity matters.

**Follow-up:**

When would you deliberately switch to a nominal-style pattern in TypeScript?

Answer: Brand a primitive with a unique symbol or phantom property so IDs of different domains stay incompatible.

### TS-002 — Type inference basics

**Difficulty:** Junior

**Category:** Type inference

**Question:**

When should you let TypeScript infer types, and when should you annotate explicitly?

**Answer:**

Prefer inference for locals and return values that are obvious from the implementation. Annotate public APIs: function parameters, exported functions, React component props, and Nest or Express handlers. Explicit annotations document contracts and catch drift when you refactor. Inside a function, `const items = await fetchItems()` can stay inferred if `fetchItems` is well typed. Over-annotating everything adds noise without safety.

**Follow-up:**

What goes wrong if you annotate a return type that is narrower than what the function actually returns?

Answer: TypeScript forces the body to match; if you lie with assertions, callers get a false contract.

### TS-003 — Interfaces vs type aliases

**Difficulty:** Intermediate

**Category:** Interfaces & type aliases

**Question:**

When do you choose `interface` over `type`, and the reverse?

**Answer:**

Use `interface` for object shapes that may be extended or merged, especially public React props and Nest DTO-like models. Use `type` for unions, intersections, mapped types, tuples, and primitives. Interfaces can declaration-merge; types cannot. In a codebase I usually pick one style for objects and stick to it, then use `type` whenever I need a union like `Status = 'idle' | 'loading' | 'error'`.

**Follow-up:**

Can two interfaces with the same name in the same scope coexist?

Answer: Yes—declaration merging combines their members into one interface.

### TS-004 — Excess property checks

**Difficulty:** Intermediate

**Category:** Assignability

**Question:**

Why does TypeScript reject an object literal with an extra property but accept the same object via a variable?

**Answer:**

Fresh object literals get excess property checks so typos in option bags are caught early. Once the value is in a variable, only structural assignability applies, so extra properties are allowed. That is why `const opts = { a: 1, typo: true }; fn(opts)` may pass while `fn({ a: 1, typo: true })` fails. In React, spreading props can bypass the check and sneak unexpected keys through.

**Follow-up:**

How do you intentionally allow extra properties on a prop type?

Answer: Add an index signature or use a more open type like `Record<string, unknown>` carefully.

### TS-005 — Union types in practice

**Difficulty:** Junior

**Category:** Unions & intersections

**Question:**

How do you safely work with a union without casting?

**Answer:**

Narrow first. Use `typeof`, `in`, equality checks, or a discriminant field. Only call members common to every branch until narrowed. For API results like `Success | Failure`, check `result.ok` or `result.status`. In React state, a union of `{ status: 'loading' } | { status: 'ready'; data: T }` keeps invalid combinations unrepresentable. Avoid `as` unless you have proven the shape at a boundary.

**Follow-up:**

What is the difference between `A | B` and overloads for call signatures?

Answer: Unions describe values; overloads describe multiple call shapes with different argument–return pairs.

### TS-006 — Intersection types

**Difficulty:** Intermediate

**Category:** Unions & intersections

**Question:**

When are intersections useful, and when do they become a smell?

**Answer:**

Intersections combine requirements: `User & Timestamps` means both shapes. They are great for mixin-style props or composing middleware context in Express. They smell when you intersect incompatible unions and get `never`, or when you glue unrelated models instead of modeling a real domain type. Prefer a clear interface that embeds the pieces when the composition is a named concept.

**Follow-up:**

What happens if you intersect `{ a: string }` with `{ a: number }`?

Answer: `a` becomes `never` because no value satisfies both.

### TS-007 — Discriminated unions

**Difficulty:** Intermediate

**Category:** Discriminated unions

**Question:**

What is a discriminated union and why do seniors reach for it in UI state?

**Answer:**

A discriminated union shares a literal tag field, like `kind` or `status`. Switching on that tag narrows the rest of the object. For React async UI: `{ status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: string }` prevents “success without data.” On the backend, Nest or Express handlers can return the same pattern for command results. Exhaustive `switch` with `never` catches missing cases.

**Follow-up:**

How do you make a switch exhaustive in TypeScript?

Answer: Assign the discriminant to `never` in the default branch so new variants fail to compile.

### TS-008 — Type guards with typeof and instanceof

**Difficulty:** Junior

**Category:** Type guards & narrowing

**Question:**

How do built-in typeof and instanceof guards help at runtime and compile time?

**Answer:**

They narrow types after a true check. `typeof x === 'string'` lets you call string methods. `x instanceof Date` narrows to Date. Remember `typeof null === 'object'` and that `instanceof` fails across realms or for plain data from JSON. For API payloads, prefer custom type guards or schema validation because JSON never gives real class instances.

**Follow-up:**

Why is `typeof` insufficient for arrays?

Answer: Arrays are objects; use `Array.isArray` instead.

### TS-009 — Custom type predicates

**Difficulty:** Intermediate

**Category:** Type guards & narrowing

**Question:**

What does a user-defined type predicate look like, and when should you write one?

**Answer:**

A predicate is `function isUser(v: unknown): v is User`. After a true call, TypeScript treats the value as `User`. Use them at trust boundaries: parsing JSON, filtering arrays, or narrowing Prisma-ish results. Keep the runtime checks honest—TypeScript trusts the predicate even if you only checked one field. Prefer Zod or similar when the shape is complex; keep predicates for small, stable checks.

**Follow-up:**

What is the risk of a dishonest type predicate?

Answer: Callers get a wrong type with no runtime safety; bugs become silent.

### TS-010 — unknown vs any

**Difficulty:** Intermediate

**Category:** any / unknown / never

**Question:**

Why prefer `unknown` over `any` for untrusted input?

**Answer:**

`unknown` forces you to narrow before use; `any` disables checking and spreads through the program. For Express `req.body`, Prisma raw queries, or `JSON.parse`, type as `unknown` then validate. `any` is sometimes needed for gradual migration or awkward third-party types, but treat it as temporary debt. Never put `any` on public React props if you can avoid it.

**Follow-up:**

Can you assign `unknown` to a typed variable without a check?

Answer: No—you must narrow, assert, or use a validated parser.

### TS-011 — never type

**Difficulty:** Intermediate

**Category:** any / unknown / never

**Question:**

What does `never` mean, and where do you see it in real code?

**Answer:**

`never` is the empty set—no value. Functions that always throw or infinite-loop return `never`. Exhaustive checks use `never` to prove all cases handled. Filtered arrays and conditional types often reduce to `never` for excluded members. If a variable becomes `never` unexpectedly, you usually intersected incompatible types or narrowed past all possibilities.

**Follow-up:**

Is `never` assignable to every type, or the reverse?

Answer: `never` is assignable to every type; only `never` is assignable to `never`.

### TS-012 — Optional vs undefined properties

**Difficulty:** Intermediate

**Category:** Object types

**Question:**

What is the difference between `prop?: string` and `prop: string | undefined`?

**Answer:**

Optional means the key may be missing. `string | undefined` means the key should be present but can hold undefined—unless exactOptionalPropertyTypes changes that. In React props, optional is common for defaults. On APIs, missing vs explicit null/undefined often have different meanings; model that with discriminants or separate fields rather than overloading one optional.

**Follow-up:**

How does exactOptionalPropertyTypes change assignability?

Answer: You cannot assign `undefined` to an optional property unless undefined is in its type.

### TS-013 — readonly and ReadonlyArray

**Difficulty:** Junior

**Category:** Object types

**Question:**

How does `readonly` help prevent accidental mutation?

**Answer:**

`readonly` on properties and `ReadonlyArray<T>` (or `readonly T[]`) block local mutation at compile time. Useful for React props and shared config objects. It is shallow—nested objects can still mutate. Runtime code can still mutate if you cast away. For deeper safety, combine with immutable patterns or libraries, but shallow readonly already catches many bugs in handlers and reducers.

**Follow-up:**

Does `readonly` exist at runtime?

Answer: No—it is erased; enforcement is compile-time only.

### TS-014 — const assertions

**Difficulty:** Intermediate

**Category:** Type inference

**Question:**

What does `as const` do, and when is it useful?

**Answer:**

`as const` makes literals narrowest and arrays/objects readonly. `'idle' as const` is the literal `'idle'`, not `string`. Great for action types, route maps, and enum-like objects without TypeScript enums. In React, `as const` on a status tuple keeps discriminants precise. Prefer it over widening annotations when you need exact literal unions.

**Follow-up:**

How do you derive a union type from a const object’s values?

Answer: `type Status = typeof STATUS[keyof typeof STATUS]` after `as const`.

### TS-015 — Enums vs union literals

**Difficulty:** Intermediate

**Category:** Enums & literals

**Question:**

Would you use TypeScript enums or string literal unions in a modern Node/React app?

**Answer:**

I prefer string literal unions or const objects. They are erasable, tree-shakeable, and serialize cleanly over the wire. Numeric enums have reverse mappings and quirks; const enums have tooling caveats. For API contracts shared with React clients, `'pending' | 'paid'` stays readable in JSON. Use enums only if a codebase already standardizes on them.

**Follow-up:**

What is a const enum tradeoff?

Answer: Inlining can break if consumers expect a runtime object, especially across compilation boundaries.

### TS-016 — Function parameter bivariance intuition

**Difficulty:** Senior

**Category:** Functions & assignability

**Question:**

Why can callback parameter types feel “unsafe,” and how do you think about it?

**Answer:**

Method parameters historically behave bivariantly for React event handler ergonomics, which can allow unsafe assignments. Prefer function property syntax in props (`onChange: (v: string) => void`) and strictFunctionTypes. When typing Express middleware or Nest pipes, keep handler args precise. If a callback might receive a subtype, ensure the consumer only uses common fields.

**Follow-up:**

How do you opt into safer function checking?

Answer: Enable `strictFunctionTypes` (included in `strict`) and prefer function props over methods.

### TS-017 — Optional chaining and narrowing

**Difficulty:** Junior

**Category:** Type guards & narrowing

**Question:**

Does optional chaining narrow types the way an if-check does?

**Answer:**

Not always. `user?.address.city` safely accesses but does not always narrow `user` afterward. Prefer explicit checks when you need the narrowed type in later statements: `if (user) { ... }`. For nested API data, combine optional chaining for reads with validation for writes. In React render, optional chaining is fine for display; for logic branches, narrow first.

**Follow-up:**

When is nullish coalescing better than `||`?

Answer: When `0` or `''` are valid values and only null/undefined should fall back.

### TS-018 — Non-null assertion

**Difficulty:** Intermediate

**Category:** Assertions

**Question:**

When is the non-null assertion (`!`) acceptable?

**Answer:**

Rarely. Use it when you and the type system know a value exists after a framework guarantee—like a ref after mount in a tightly controlled path. Prefer proper narrowing or redesigning types so nullability is honest. In Node handlers, don’t `req.user!` without middleware that actually sets it; instead type an authenticated request interface after the guard.

**Follow-up:**

What is safer than `!` for Map lookups?

Answer: Check with `has`/`get` and handle undefined, or throw a typed error.

### TS-019 — Type assertions vs casting

**Difficulty:** Intermediate

**Category:** Assertions

**Question:**

What is the difference between a type assertion and a real conversion?

**Answer:**

Assertions (`as T`) only change the compile-time view; they do not convert values. `as User` on JSON is a lie unless you validated. Runtime conversion means parsing, mapping, or schema validation. At API boundaries—fetch in React, Express body, Prisma JSON fields—validate then type. Double assertions via `unknown` are a smell that types are fighting you.

**Follow-up:**

When is `as const` different from `as SomeType`?

Answer: `as const` narrows to literal/readonly forms; `as SomeType` widens or forces a target type.

### TS-020 — Generics introduction

**Difficulty:** Junior

**Category:** Generics

**Question:**

Explain generics with a practical React or Node example.

**Answer:**

Generics parameterize types. `function identity<T>(value: T): T` preserves the input type. In React, `useState<User | null>(null)` parameterizes state. For fetch helpers, `async function getJson<T>(url: string): Promise<T>` lets callers decide the expected shape—still validate at runtime. On the backend, repository methods like `findById<T extends { id: string }>` keep shared logic typed.

**Follow-up:**

What does a default type parameter buy you?

Answer: Callers can omit the generic when a sensible default fits most cases.

### TS-021 — Generic constraints

**Difficulty:** Intermediate

**Category:** Generics

**Question:**

How do `extends` constraints improve generic functions?

**Answer:**

Constraints require type parameters to have certain members: `<T extends { id: string }>`. Then you can safely read `item.id`. Useful for React list keys, sorting helpers, and Prisma-like entities. Don’t over-constrain; if you only need `id`, don’t require a full `User`. Constraints also enable keyof relationships like `T extends keyof U`.

**Follow-up:**

Can you constrain a generic to another type parameter?

Answer: Yes—`<T, K extends keyof T>` is the classic pattern for property accessors.

### TS-022 — keyof and indexed access

**Difficulty:** Intermediate

**Category:** Keyof & indexed access

**Question:**

How do `keyof` and `T[K]` help write type-safe property helpers?

**Answer:**

`keyof T` is the union of property names. `T[K]` is the property’s type. Together: `function get<T, K extends keyof T>(obj: T, key: K): T[K]`. In React forms, this types field names against a model. On the server, it types sorting fields against entity keys so invalid columns fail at compile time.

**Follow-up:**

What is `T[number]` useful for?

Answer: Extracting the element type from a tuple or array type.

### TS-023 — typeof operator in types

**Difficulty:** Junior

**Category:** Type queries

**Question:**

How is `typeof` in a type position different from runtime typeof?

**Answer:**

In types, `typeof value` captures the static type of a value. Useful after `as const` config objects or to mirror a runtime map. Example: derive props from a default config without duplicating. Runtime `typeof` returns strings like `'string'`. Don’t confuse them in interviews—same keyword, different worlds, and types erase before Node or the browser runs.

**Follow-up:**

Can you write `typeof` on a type alias?

Answer: No—`typeof` applies to values; use the alias name directly in type position.

### TS-024 — Utility type Partial

**Difficulty:** Junior

**Category:** Utility types

**Question:**

Where do you use `Partial<T>` in full-stack apps?

**Answer:**

For updates and patches. A PATCH body can be `Partial<UserDto>` so every field is optional. In React, setState updaters or form draft types often use Partial. Remember Partial is shallow. Nested objects stay required inside unless you write a DeepPartial. Pair with validation so empty patches and invalid fields are rejected at runtime.

**Follow-up:**

Why is DeepPartial not built in?

Answer: It is recursive and edge-case heavy; teams define it when needed.

### TS-025 — Required, Readonly, Pick, Omit

**Difficulty:** Intermediate

**Category:** Utility types

**Question:**

How do you use Pick and Omit to shape DTOs without duplication?

**Answer:**

Start from a domain model, then `Pick<User, 'id' | 'email'>` for list items and `Omit<User, 'passwordHash'>` for API responses. `Required` and `Readonly` tighten or lock fields for create vs read models. This keeps React view models and Nest/Express response types aligned with one source. Avoid long Omit chains—if the shape is a real concept, name a dedicated type.

**Follow-up:**

What is a downside of heavy Omit usage?

Answer: Silent breakage when the source type gains fields you meant to exclude by convention.

### TS-026 — Record type

**Difficulty:** Junior

**Category:** Utility types

**Question:**

When is `Record<K, V>` the right tool?

**Answer:**

When keys are a known union and values share a type: `Record<Status, number>` for counts, or `Record<string, Handler>` for Express route maps. Prefer it over index signatures when keys should be constrained. For open-ended maps, `Record<string, V>` works but allows any string key. In React, lookup tables for labels by enum-like unions are a common fit.

**Follow-up:**

How does Record interact with optional keys?

Answer: All keys in K are required unless you use a mapped type with `?`.

### TS-027 — Exclude Extract NonNullable

**Difficulty:** Intermediate

**Category:** Utility types

**Question:**

How do Exclude, Extract, and NonNullable help refine unions?

**Answer:**

`Exclude<T, U>` removes members assignable to U. `Extract` keeps them. `NonNullable` removes null and undefined. Handy for filtering event unions or API result tags. Example: `Extract<Result, { ok: true }>` for success handling. Prefer discriminants for readability when refining object unions in business logic.

**Follow-up:**

How would you get only string members from a mixed union?

Answer: `Extract<MyUnion, string>`.

### TS-028 — ReturnType and Parameters

**Difficulty:** Intermediate

**Category:** Utility types

**Question:**

When do ReturnType and Parameters save you from drift?

**Answer:**

They derive types from existing functions. `ReturnType<typeof loadUser>` stays in sync with the loader. `Parameters<typeof handler>` helps wrap Express/Nest handlers. Useful when wrapping React hooks or Node utilities without re-declaring signatures. If the function is overloaded, you get the last overload’s types—know that limitation.

**Follow-up:**

How do you type the resolved value of an async function?

Answer: `Awaited<ReturnType<typeof fn>>`.

### TS-029 — Awaited utility

**Difficulty:** Intermediate

**Category:** Utility types

**Question:**

What problem does `Awaited<T>` solve?

**Answer:**

It recursively unwraps Promise types so you can talk about the resolved value. Critical for async React loaders, server actions, and Node services. Instead of manually writing nested Promise unwraps, `Awaited<ReturnType<typeof getOrder>>` stays correct if the function later returns a Promise. Combine with generics for typed data-fetching hooks.

**Follow-up:**

Does Awaited unwrap thenables that aren’t Promise?

Answer: Yes—it unwraps thenable-like shapes in the type system.

### TS-030 — Compile time vs runtime

**Difficulty:** Intermediate

**Category:** Compile-time vs runtime

**Question:**

What TypeScript features disappear at runtime, and what remains?

**Answer:**

Interfaces, type aliases, generics, and annotations erase. Enums (non-const), classes, and emitted JS remain. That means you cannot `switch` on a type, and you cannot validate JSON with types alone. In production React/Node, pair types with Zod, class-validator, or manual checks at boundaries. Interviews often probe whether you understand erasure.

**Follow-up:**

Why can’t you iterate union members at runtime from a type?

Answer: Types do not exist at runtime unless you mirror them with values.

### TS-031 — Typing JSON.parse

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

How do you type `JSON.parse` safely?

**Answer:**

`JSON.parse` returns `any` historically; treat the result as `unknown`. Pass it through a schema or type guard before using. In React query functions and Express bodies, never `as MyType` immediately. Prefer `const data = schema.parse(JSON.parse(text))` so runtime and types agree. That pattern scales to shared client/server contracts.

**Follow-up:**

Is asserting after JSON.parse ever okay?

Answer: Only for trusted static fixtures in tests—not for network or user input.

### TS-032 — Typing fetch responses

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

How would you design a type-safe fetch helper for a React client?

**Answer:**

Keep generics for the expected data, but validate: `async function api<T>(url: string, schema: ZodType<T>): Promise<T>`. Check `res.ok`, parse JSON as unknown, then schema.parse. Return a Result union `{ ok: true; data: T } | { ok: false; error: ApiError }` for non-throwing flows. Avoid silent `as T` on `res.json()`. Share DTO types with the backend when possible.

**Follow-up:**

Where should shared DTO types live in a monorepo?

Answer: In a shared package both Nest/Express and React import.

### TS-033 — Result types for APIs

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

Why prefer a Result union over throwing for some service methods?

**Answer:**

A Result like `{ ok: true; value: T } | { ok: false; error: E }` makes failure part of the type. Callers must handle errors. Useful for expected domain failures—not found, validation, conflict—while reserving throws for truly exceptional cases. Works well from Prisma-ish repositories up to React UI state. Keep error codes as literal unions for exhaustiveness.

**Follow-up:**

How do you keep Result ergonomic without nesting hell?

Answer: Helper functions like `map`/`unwrapOr` or early returns after narrowing `ok`.

### TS-034 — Narrowing with in operator

**Difficulty:** Junior

**Category:** Type guards & narrowing

**Question:**

How does the `in` operator help narrow object unions?

**Answer:**

Checking `'data' in result` narrows to members that declare `data`. Useful when discriminants differ or third-party types are uneven. Prefer a shared literal tag when you control the model. Be careful: `in` checks prototype chain at runtime. For plain API objects it is usually fine; for class instances, know the semantics.

**Follow-up:**

When is a discriminant better than `in`?

Answer: When every variant should share one explicit tag field for clarity and exhaustiveness.

### TS-035 — Control flow analysis

**Difficulty:** Intermediate

**Category:** Type guards & narrowing

**Question:**

How does TypeScript’s control flow analysis narrow variables?

**Answer:**

Assignments, returns, throws, and conditions refine types along paths. After `if (!user) return`, user is defined below. Reassigning a let can widen again. Closures can lose narrowing if the variable may change—captured lets are tricky. Prefer const and early returns in Express handlers and React event handlers for readable narrowing.

**Follow-up:**

Why might narrowing fail inside a nested function?

Answer: The variable could be reassigned before the nested function runs.

### TS-036 — Typing React props

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type React function component props cleanly?

**Answer:**

Define a Props interface or type and annotate the component: `function Button({ label, onClick }: ButtonProps)`. Prefer explicit props over `React.FC` for clearer generics and children. Optional props use `?` and defaults in the parameter list. For polymorphic components, reach for generics later—keep base components simple. Export Props when tests or stories need them.

**Follow-up:**

How do you type children?

Answer: `children?: React.ReactNode` unless you need a stricter structure.

### TS-037 — Typing React events

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type form and input events in React?

**Answer:**

Use specific event types: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`, `React.MouseEvent<HTMLButtonElement>`. Read values from `event.currentTarget` with the right element type. For generic handlers passed as props, type the callback as `(value: string) => void` and adapt inside the component. Avoid `any` on events—it hides target mistakes.

**Follow-up:**

What is the difference between target and currentTarget typing?

Answer: currentTarget is the element the handler is bound to; target may be a nested element.

### TS-038 — Typing useState and useRef

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

What are common pitfalls typing useState and useRef?

**Answer:**

`useState(null)` infers `null`; provide `useState<User | null>(null)`. For refs holding DOM nodes, `useRef<HTMLInputElement | null>(null)` and accept null until mount. For mutable boxes, `useRef(0)` is fine. Don’t non-null assert refs in render. For complex state, prefer discriminated unions over multiple booleans.

**Follow-up:**

When should useReducer’s action types be a discriminated union?

Answer: Whenever actions carry different payloads—so reducers stay exhaustive and safe.

### TS-039 — Typing custom hooks

**Difficulty:** Intermediate

**Category:** React patterns

**Question:**

How do you type a custom hook that returns data, loading, and error?

**Answer:**

Return a discriminated union or a consistent object with generics: `function useQuery<T>(...): { data: T | null; error: Error | null; status: Status }`. Better: status-driven unions so data exists only when success. Infer T from a fetcher argument when possible. Export the return type with `ReturnType<typeof useQuery<MyType>>` carefully, or define an explicit alias for public hooks.

**Follow-up:**

How can the hook infer T from a schema or fetcher?

Answer: Generic defaults from function arguments: `<T>(fetcher: () => Promise<T>)`.

### TS-040 — Express request and response typing

**Difficulty:** Intermediate

**Category:** Backend patterns

**Question:**

How do you type Express handlers without losing safety?

**Answer:**

Type params, query, and body via generics on `Request`, or wrap handlers with helper types. Prefer validating body with a schema, then typing the handler on the parsed output. Extend Request for `user` after auth middleware. Keep `res.json` payloads typed via explicit return types or response helpers so React clients and server stay aligned.

**Follow-up:**

Why is `Request<any, any, any, any>` a smell?

Answer: It erases the value of generics and invites unsafe access.

### TS-041 — NestJS DTOs lightly

**Difficulty:** Intermediate

**Category:** Backend patterns

**Question:**

How do Nest-style DTOs relate to TypeScript types?

**Answer:**

DTO classes often carry runtime validation decorators while also acting as types. Interfaces alone won’t validate. In Nest, a CreateUserDto class is both a compile-time type and a runtime shape for pipes. For non-Nest Express apps, mimic that with Zod schemas that export `z.infer<typeof schema>`. Don’t confuse decorator metadata with structural typing—validation still must run.

**Follow-up:**

Can you use an interface as a Nest DTO for validation?

Answer: No—interfaces erase; you need a class or schema at runtime.

### TS-042 — Prisma-ish result typing

**Difficulty:** Intermediate

**Category:** Backend patterns

**Question:**

How do you type repository results when an ORM returns rich objects?

**Answer:**

Prefer generated client types or infer from queries. For selected fields, use the query’s result type rather than a hand-written full model. Map to API DTOs explicitly so you don’t leak password hashes. Represent not-found as `T | null` or Result. For includes/relations, let inference follow the query shape to avoid lying with assertions.

**Follow-up:**

Why map ORM models to DTOs instead of returning them raw?

Answer: Encapsulation, security, and stable API contracts as the schema evolves.

### TS-043 — Strict mode flags that matter

**Difficulty:** Intermediate

**Category:** Tooling & config

**Question:**

Which compiler flags do you expect in a senior TypeScript codebase?

**Answer:**

`strict` is baseline. Especially valuable: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUncheckedIndexedAccess` for safer array/index access, and `exactOptionalPropertyTypes` when the team can adopt it. For apps, `noEmit` with a bundler or `tsc` for types only is common. Interviews look for judgment, not memorizing every flag.

**Follow-up:**

What does noUncheckedIndexedAccess change?

Answer: Index reads become `T | undefined`, forcing checks.

### TS-044 — Declaration files and ambient types

**Difficulty:** Intermediate

**Category:** Modules & declarations

**Question:**

When do you write a `.d.ts` file?

**Answer:**

When a JS library lacks types, or you need ambient module shims for assets like CSS modules or images in React. Keep declarations minimal and accurate. Prefer DefinitelyTyped or upstream types when available. For internal JS modules during migration, allowJs plus gradual typing can be better than huge hand-written defs.

**Follow-up:**

What is `declare module '*.css'` doing?

Answer: Telling TypeScript that CSS imports exist and what type they have.

### TS-045 — Modules: type-only imports

**Difficulty:** Intermediate

**Category:** Modules & declarations

**Question:**

Why use `import type`?

**Answer:**

It marks imports erased at compile time, avoiding circular runtime imports and keeping emit clean under `verbatimModuleSyntax` or isolatedModules. Use it for interfaces, types, and type-only re-exports between React and shared packages. Mixing value and type imports is fine when you need both; be intentional under modern TS settings.

**Follow-up:**

What breaks if you import a class only as a type but use it as a value?

Answer: Runtime ReferenceError—the class was erased from the import.

### TS-046 — Tuple types

**Difficulty:** Intermediate

**Category:** Tuples & arrays

**Question:**

When are tuples better than arrays in TypeScript?

**Answer:**

When position matters: `[latitude, longitude]`, React `useState` pair analogies, or rest argument lists. Tuples can have labeled elements and optional trailing members. `as const` often produces readonly tuples for config. Don’t use tuples for open-ended lists—use arrays. For return pairs, prefer an object if names clarify meaning.

**Follow-up:**

How do you type a rest parameter of fixed prefixes?

Answer: Use a tuple type for the parameter list.

### TS-047 — Function overloads

**Difficulty:** Senior

**Category:** Functions & assignability

**Question:**

When are call signature overloads worth it?

**Answer:**

When a function has a few distinct input–output relationships that a single union signature would weaken. Example: `parse(input: string): User` vs `parse(input: string, schema: Schema<T>): T`. Keep overloads small; implement with a broad signature. In React libraries, overloads often type polymorphic components. If one generic signature works, skip overloads.

**Follow-up:**

Which overload does ReturnType see?

Answer: Typically the last callable overload signature.

### TS-048 — Satisfies operator

**Difficulty:** Intermediate

**Category:** Type inference

**Question:**

What problem does `satisfies` solve compared to annotations?

**Answer:**

`satisfies` checks a value against a type while preserving the more specific inferred type. Great for config objects: ensure keys match a route map type but keep literal values for `as const`-like precision. In React, theme or feature-flag maps benefit. Prefer it when annotation would widen and assertion would skip checking.

**Follow-up:**

How is `satisfies` different from `as`?

Answer: `satisfies` validates; `as` forces without ensuring compatibility beyond basic rules.

### TS-049 — Narrowing with equality and switch

**Difficulty:** Junior

**Category:** Type guards & narrowing

**Question:**

How do equality checks narrow literal unions?

**Answer:**

Comparing a variable to a literal removes that possibility from other branches. `switch (status)` narrows per case. This powers discriminated unions in UI and API results. Use constants typed as literals so comparisons stay precise. After handling all cases, a `never` check documents exhaustiveness for future statuses.

**Follow-up:**

Why might comparing two variables not narrow?

Answer: TypeScript often cannot assume they are linked without a discriminant pattern.

### TS-050 — Practical boundary validation pattern

**Difficulty:** Intermediate

**Category:** Type-safe API responses

**Question:**

Describe an end-to-end pattern for type-safe API data from Express to React.

**Answer:**

Define a schema in a shared module, export `type User = z.infer<typeof userSchema>`. Express validates `req.body` with the schema before the handler runs. The handler returns a typed DTO. React fetch parses the response with the same schema. Types flow from one source; runtime checks protect both edges. That beats duplicating interfaces and asserting everywhere.

**Follow-up:**

What do you do if the client and server cannot share code?

Answer: Publish an OpenAPI/JSON Schema contract and generate types on both sides.
