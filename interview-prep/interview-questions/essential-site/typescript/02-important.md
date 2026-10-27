# Essential TypeScript — Important

3-day essential set. 30 questions in preparation order. Full handbook remains under `typescript/`.

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
