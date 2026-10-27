# TypeScript — Essential (3-day)

New bank of 100 questions. Ordered by preparation priority within each tier.

## Must Know (40)

1. [TS-010](../typescript/01-foundations.md#ts-010) — unknown vs any
   Why: Classic senior probe; shows boundary discipline and refusal of any-spreading. Score: 100

2. [TS-001](../typescript/01-foundations.md#ts-001) — Structural typing vs nominal typing
   Why: Core mental model; explains assignability surprises from Java/C# backgrounds. Score: 99

3. [TS-030](../typescript/01-foundations.md#ts-030) — Compile time vs runtime
   Why: Separates types from validation; filters candidates who treat interfaces as runtime. Score: 98

4. [TS-007](../typescript/01-foundations.md#ts-007) — Discriminated unions
   Why: Highest-leverage modeling tool for UI state and API results. Score: 97

5. [TS-003](../typescript/01-foundations.md#ts-003) — Interfaces vs type aliases
   Why: Everyday design choice; merging vs unions comes up constantly. Score: 96

6. [TS-005](../typescript/01-foundations.md#ts-005) — Union types in practice
   Why: Foundation for narrowing; unsafe casting is a common failure mode. Score: 95

7. [TS-020](../typescript/01-foundations.md#ts-020) — Generics introduction
   Why: Baseline for reusable React/Node helpers without losing types. Score: 94

8. [TS-002](../typescript/01-foundations.md#ts-002) — Type inference basics
   Why: Shows judgment about when annotations help public APIs. Score: 93

9. [TS-011](../typescript/01-foundations.md#ts-011) — never type
   Why: Exhaustiveness and impossible states; senior-level fluency signal. Score: 92

10. [TS-036](../typescript/01-foundations.md#ts-036) — Typing React props
   Why: Daily full-stack work; React.FC debates still appear in interviews. Score: 91

11. [TS-050](../typescript/01-foundations.md#ts-050) — Practical boundary validation pattern
   Why: End-to-end contract pattern interviewers expect from seniors. Score: 90

12. [TS-031](../typescript/01-foundations.md#ts-031) — Typing JSON.parse
   Why: Litmus test for unknown + validation vs blind assertions. Score: 89

13. [TS-032](../typescript/01-foundations.md#ts-032) — Typing fetch responses
   Why: Practical client safety; pairs with shared DTO strategies. Score: 88

14. [TS-009](../typescript/01-foundations.md#ts-009) — Custom type predicates
   Why: Bridge between runtime checks and narrowing; honesty matters. Score: 87

15. [TS-021](../typescript/01-foundations.md#ts-021) — Generic constraints
   Why: Stops hand-wavy generics; keyof patterns start here. Score: 86

16. [TS-022](../typescript/01-foundations.md#ts-022) — keyof and indexed access
   Why: Type-safe property access; forms, sorting, and config keys. Score: 85

17. [TS-019](../typescript/01-foundations.md#ts-019) — Type assertions vs casting
   Why: Assertions are not conversions; catches dangerous as-habits. Score: 84

18. [TS-024](../typescript/01-foundations.md#ts-024) — Utility type Partial
   Why: PATCH/update modeling; shallow Partial pitfalls are fair game. Score: 83

19. [TS-025](../typescript/01-foundations.md#ts-025) — Required, Readonly, Pick, Omit
   Why: DTO shaping without duplication; common whiteboard ask. Score: 82

20. [TS-038](../typescript/01-foundations.md#ts-038) — Typing useState and useRef
   Why: Inference traps with null refs and state unions. Score: 81

21. [TS-037](../typescript/01-foundations.md#ts-037) — Typing React events
   Why: Specific event generics show practical React TS skill. Score: 80

22. [TS-014](../typescript/01-foundations.md#ts-014) — const assertions
   Why: Literal narrowing for actions, routes, and status maps. Score: 79

23. [TS-015](../typescript/01-foundations.md#ts-015) — Enums vs union literals
   Why: Modern preference signal; enum pitfalls are interview favorites. Score: 78

24. [TS-008](../typescript/01-foundations.md#ts-008) — Type guards with typeof and instanceof
   Why: Built-in narrowing limits; JSON/class caveats. Score: 77

25. [TS-004](../typescript/01-foundations.md#ts-004) — Excess property checks
   Why: Explains literal vs variable assignability quirks. Score: 76

26. [TS-033](../typescript/01-foundations.md#ts-033) — Result types for APIs
   Why: Typed success/failure without overusing throws. Score: 75

27. [TS-006](../typescript/01-foundations.md#ts-006) — Intersection types
   Why: Composition tool; never-from-conflict is a common follow-up. Score: 74

28. [TS-012](../typescript/01-foundations.md#ts-012) — Optional vs undefined properties
   Why: Missing vs undefined semantics; exactOptionalPropertyTypes. Score: 73

29. [TS-040](../typescript/01-foundations.md#ts-040) — Express request and response typing
   Why: Backend half of full-stack TS; body/user augmentation. Score: 72

30. [TS-039](../typescript/01-foundations.md#ts-039) — Typing custom hooks
   Why: Generic hooks and status unions show React depth. Score: 71

31. [TS-026](../typescript/01-foundations.md#ts-026) — Record type
   Why: Lookup tables and constrained key maps. Score: 70

32. [TS-035](../typescript/01-foundations.md#ts-035) — Control flow analysis
   Why: Why narrowing fails in closures; early-return style. Score: 69

33. [TS-028](../typescript/01-foundations.md#ts-028) — ReturnType and Parameters
   Why: Derive from functions to prevent signature drift. Score: 68

34. [TS-027](../typescript/01-foundations.md#ts-027) — Exclude Extract NonNullable
   Why: Union surgery utilities used across codebases. Score: 67

35. [TS-023](../typescript/01-foundations.md#ts-023) — typeof operator in types
   Why: Value-to-type queries; config-driven typing. Score: 66

36. [TS-088](../typescript/02-advanced-patterns.md#ts-088) — Using never for impossible states
   Why: Make illegal states unrepresentable—senior design mantra. Score: 65

37. [TS-043](../typescript/01-foundations.md#ts-043) — Strict mode flags that matter
   Why: Config judgment; noUncheckedIndexedAccess etc. Score: 64

38. [TS-013](../typescript/01-foundations.md#ts-013) — readonly and ReadonlyArray
   Why: Shallow immutability for props and shared data. Score: 63

39. [TS-045](../typescript/01-foundations.md#ts-045) — Modules: type-only imports
   Why: Erase-only imports; verbatimModuleSyntax readiness. Score: 62

40. [TS-017](../typescript/01-foundations.md#ts-017) — Optional chaining and narrowing
   Why: Safe access vs true narrowing; nullish coalescing. Score: 61

## Important (30)

1. [TS-058](../typescript/02-advanced-patterns.md#ts-058) — Branded / nominal types
   Why: Prevents ID mixups; high signal without heavy type magic. Score: 60

2. [TS-070](../typescript/02-advanced-patterns.md#ts-070) — Validation layer and type inference
   Why: Schema-first coupling of runtime and static types. Score: 59

3. [TS-041](../typescript/01-foundations.md#ts-041) — NestJS DTOs lightly
   Why: Classes for validation metadata vs erased interfaces. Score: 58

4. [TS-042](../typescript/01-foundations.md#ts-042) — Prisma-ish result typing
   Why: Query-shaped types and DTO mapping discipline. Score: 57

5. [TS-066](../typescript/02-advanced-patterns.md#ts-066) — Exhaustiveness in reducers
   Why: never checks in useReducer; scalable UI state. Score: 56

6. [TS-065](../typescript/02-advanced-patterns.md#ts-065) — Discriminated props in React
   Why: Mutually exclusive props modeled as unions. Score: 55

7. [TS-016](../typescript/01-foundations.md#ts-016) — Function parameter bivariance intuition
   Why: Explains unsafe callback assignability and React history. Score: 54

8. [TS-048](../typescript/01-foundations.md#ts-048) — Satisfies operator
   Why: Validate without widening; modern config typing. Score: 53

9. [TS-029](../typescript/01-foundations.md#ts-029) — Awaited utility
   Why: Async return unwrapping for loaders and services. Score: 52

10. [TS-069](../typescript/02-advanced-patterns.md#ts-069) — Middleware typing in Express
   Why: Augmented Request after auth; common backend ask. Score: 51

11. [TS-099](../typescript/02-advanced-patterns.md#ts-099) — Pattern: parsed vs raw request types
   Why: Encodes validation stage in the type system. Score: 50

12. [TS-067](../typescript/02-advanced-patterns.md#ts-067) — Typing context without default lies
   Why: Avoid fake defaults; throw-and-narrow hook pattern. Score: 49

13. [TS-076](../typescript/02-advanced-patterns.md#ts-076) — Narrowing with assertion functions
   Why: asserts keyword for guards that throw. Score: 48

14. [TS-064](../typescript/02-advanced-patterns.md#ts-064) — Typing forwardRef
   Why: Generic order pitfalls; still common in component libs. Score: 47

15. [TS-082](../typescript/02-advanced-patterns.md#ts-082) — Type predicates with array filter
   Why: Nullable list cleanup; practical predicate use. Score: 46

16. [TS-095](../typescript/02-advanced-patterns.md#ts-095) — Standard Schema / shared contracts mindset
   Why: Contracts beyond shared interfaces alone. Score: 45

17. [TS-093](../typescript/02-advanced-patterns.md#ts-093) — Differentiating null and undefined in APIs
   Why: PATCH semantics; JSON omit vs null. Score: 44

18. [TS-075](../typescript/02-advanced-patterns.md#ts-075) — Typing process.env
   Why: Startup schema for env; no non-null spam. Score: 43

19. [TS-018](../typescript/01-foundations.md#ts-018) — Non-null assertion
   Why: When ! is acceptable vs lazy escape hatch. Score: 42

20. [TS-091](../typescript/02-advanced-patterns.md#ts-091) — Progressive adoption strategies
   Why: Migration judgment for real codebases. Score: 41

21. [TS-092](../typescript/02-advanced-patterns.md#ts-092) — Type-safe routing params
   Why: Router generics plus runtime validation. Score: 40

22. [TS-086](../typescript/02-advanced-patterns.md#ts-086) — Safe indexing patterns
   Why: noUncheckedIndexedAccess survival skills. Score: 39

23. [TS-046](../typescript/01-foundations.md#ts-046) — Tuple types
   Why: Positional pairs vs objects; rest params. Score: 38

24. [TS-034](../typescript/01-foundations.md#ts-034) — Narrowing with in operator
   Why: Object-union narrowing without a shared tag. Score: 37

25. [TS-049](../typescript/01-foundations.md#ts-049) — Narrowing with equality and switch
   Why: Literal refinement basics that enable discriminants. Score: 36

26. [TS-080](../typescript/02-advanced-patterns.md#ts-080) — Satisfies vs as const for config maps
   Why: Combine precision with structural checking. Score: 35

27. [TS-098](../typescript/02-advanced-patterns.md#ts-098) — Class vs interface for domain models
   Why: Runtime behavior vs pure data contracts. Score: 34

28. [TS-044](../typescript/01-foundations.md#ts-044) — Declaration files and ambient types
   Why: Shimming untyped modules and assets. Score: 33

29. [TS-085](../typescript/02-advanced-patterns.md#ts-085) — Typing error boundaries and fallback props
   Why: unknown thrown values; fallback prop shapes. Score: 32

30. [TS-079](../typescript/02-advanced-patterns.md#ts-079) — Typing CSS modules and assets
   Why: Ambient module declarations for bundler imports. Score: 31

## Advanced (30)

1. [TS-051](../typescript/02-advanced-patterns.md#ts-051) — Conditional types basics
   Why: Gateway to library-level TypeScript. Score: 30

2. [TS-053](../typescript/02-advanced-patterns.md#ts-053) — infer keyword
   Why: Unpacking nested types in custom utilities. Score: 29

3. [TS-054](../typescript/02-advanced-patterns.md#ts-054) — Mapped types
   Why: How Partial/Readonly work; derive transforms. Score: 28

4. [TS-052](../typescript/02-advanced-patterns.md#ts-052) — Distributive conditional types
   Why: Union distribution surprises; tuple wrap trick. Score: 27

5. [TS-100](../typescript/02-advanced-patterns.md#ts-100) — Staff-level judgment: when not to be clever
   Why: Taste over type Tetris; staff differentiator. Score: 26

6. [TS-061](../typescript/02-advanced-patterns.md#ts-061) — Variance: covariance and contravariance intuition
   Why: Deep assignability for callbacks and collections. Score: 25

7. [TS-055](../typescript/02-advanced-patterns.md#ts-055) — Key remapping with as
   Why: Filter/rename keys in mapped types. Score: 24

8. [TS-056](../typescript/02-advanced-patterns.md#ts-056) — Template literal types
   Why: String-level type construction for events/routes. Score: 23

9. [TS-063](../typescript/02-advanced-patterns.md#ts-063) — Polymorphic React components
   Why: as-prop design-system typing. Score: 22

10. [TS-062](../typescript/02-advanced-patterns.md#ts-062) — Typing higher-order React components
   Why: Injected props with Omit; still asked. Score: 21

11. [TS-059](../typescript/02-advanced-patterns.md#ts-059) — Opaque results and API error modeling
   Why: Structured error unions across client/server. Score: 20

12. [TS-047](../typescript/01-foundations.md#ts-047) — Function overloads
   Why: Multi-call contracts when unions weaken returns. Score: 19

13. [TS-060](../typescript/02-advanced-patterns.md#ts-060) — Type-safe event emitters
   Why: Event maps tying names to payloads. Score: 18

14. [TS-081](../typescript/02-advanced-patterns.md#ts-081) — Building DeepPartial
   Why: Recursive mapped types with array caveats. Score: 17

15. [TS-068](../typescript/02-advanced-patterns.md#ts-068) — Generic repository pattern on the backend
   Why: CRUD generics without fighting the ORM. Score: 16

16. [TS-083](../typescript/02-advanced-patterns.md#ts-083) — Const type parameters
   Why: Modern literal inference at call sites. Score: 15

17. [TS-071](../typescript/02-advanced-patterns.md#ts-071) — Conditional types for function overloads alternatives
   Why: Single signature with conditional returns. Score: 14

18. [TS-072](../typescript/02-advanced-patterns.md#ts-072) — Extracting promise and generator types
   Why: Custom unwrap beyond Awaited. Score: 13

19. [TS-078](../typescript/02-advanced-patterns.md#ts-078) — Covariance of promises and arrays pitfalls
   Why: Mutable array unsafety; readonly inputs. Score: 12

20. [TS-084](../typescript/02-advanced-patterns.md#ts-084) — NoInfer and inference control
   Why: Modern inference steering for library APIs. Score: 11

21. [TS-057](../typescript/02-advanced-patterns.md#ts-057) — Recursive types carefully
   Why: Trees/DeepReadonly vs compiler cost. Score: 10

22. [TS-089](../typescript/02-advanced-patterns.md#ts-089) — Intersection of functions and overloads
   Why: Surprising callability of function unions. Score: 9

23. [TS-094](../typescript/02-advanced-patterns.md#ts-094) — Utility type: Uppercase keys mapper example
   Why: Mapped + template exercise often used in screens. Score: 8

24. [TS-096](../typescript/02-advanced-patterns.md#ts-096) — Typing websockets or SSE messages
   Why: Realtime protocol unions with validation. Score: 7

25. [TS-090](../typescript/02-advanced-patterns.md#ts-090) — Typing SQL/query builders lightly
   Why: Raw SQL safety without full ORM inference. Score: 6

26. [TS-074](../typescript/02-advanced-patterns.md#ts-074) — ModuleResolution bundler vs Node
   Why: ESM/CJS resolution mismatches in monorepos. Score: 5

27. [TS-073](../typescript/02-advanced-patterns.md#ts-073) — Path mapping and project references awareness
   Why: Aliases and references that match runtime. Score: 4

28. [TS-087](../typescript/02-advanced-patterns.md#ts-087) — Dual packages and types versions
   Why: Shipping types for React and Node consumers. Score: 3

29. [TS-077](../typescript/02-advanced-patterns.md#ts-077) — this parameter typing
   Why: Fake this param; niche but occasionally asked. Score: 2

30. [TS-097](../typescript/02-advanced-patterns.md#ts-097) — Performance of types in large codebases
   Why: Staff ops: slow types, project references, export discipline. Score: 1
