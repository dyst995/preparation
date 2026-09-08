# TypeScript's Type System: Structural and Erased — Self-test

## Core recall

1. What is structural typing in TypeScript?
2. What is nominal typing, in contrast?
3. What does type erasure mean?
4. Why can’t you write `value instanceof SomeInterface`?
5. Why can `value instanceof SomeClass` work?
6. Name three runtime mechanisms for checking shapes/values after erasure.
7. What does `tsc` do that Babel/SWC often do not?
8. Do TypeScript generics exist as runtime values you can branch on?

## Explain why

1. Why does TypeScript use structural typing instead of Java-like nominal typing by default?
2. Why is erasure a deliberate design for TypeScript-on-JavaScript?
3. Why does `const obj = { x, y, z }; logPoint(obj)` type-check while a fresh `{ x, y, z }` literal might error?
4. Why isn’t `JSON.parse(s) as User` a runtime guarantee?
5. Why can a project “use TypeScript” and still ship type errors if it only builds with SWC?
6. Why do Nest apps still use `class-validator` if controllers are already typed?

## Compare and contrast

1. Structural vs nominal typing.
2. Interface vs class regarding runtime existence.
3. JS value-`typeof` vs TS type-query `typeof` (high level).
4. `tsc` emit+check vs Babel/SWC strip-only.
5. Compile-time type safety vs runtime validation.
6. Excess property checking vs general structural assignability (seed-level).

## Predict the output / checker result

For each: does it type-check? What runs at runtime? Explain why.

1.
```ts
interface Point { x: number; y: number }
function f(p: Point) {}
const a = { x: 1, y: 2, z: 3 };
f(a);
```

2.
```ts
interface Point { x: number; y: number }
function f(p: Point) {}
f({ x: 1, y: 2, z: 3 });
```

3.
```ts
interface User { id: string }
function check(u: unknown) {
  return u instanceof User; // ?
}
```

4.
```ts
class User { constructor(public id: string) {} }
console.log(new User('1') instanceof User);
```

5.
```ts
function identity<T>(x: T): T { return x; }
// After compilation, what remains of T?
```

6.
```ts
const n: number = 1;
console.log(typeof n); // runtime: ?
```

## Debugging

1. Diagnose:
```ts
interface Animal { name: string }
function isAnimal(x: any) {
  return x instanceof Animal;
}
```

2. Diagnose false confidence:
```ts
type User = { id: string; email: string };
async function loadUser(res: Response): Promise<User> {
  return res.json();
}
```

3. Diagnose CI gap:
App builds with Vite/SWC in PRs; production crashed on a typo’d property access that `tsc` would have caught. What was missing?

4. Diagnose Nest confusion:
“I typed the body as `CreateUserDto` interface, so invalid JSON can’t reach my service.” What’s wrong?

## Application

1. Write a type predicate `isPoint(v: unknown): v is Point` for `{ x: number; y: number }`.

2. Given structural typing, show two differently named types that are mutually assignable, and one way to make them *intentionally* incompatible (sketch branded type or private-field class — brief is enough).

3. Sketch a pipeline: `tsc --noEmit` in CI + SWC for emit — one sentence why each part exists.

4. Replace an unsafe `as User` after `JSON.parse` with either a predicate or a zod-style conceptual step (API sketch is fine).

## Interview questions

1. Can you check `if (value instanceof SomeInterface)` in TypeScript?  
   **Follow-ups:** What about classes? How do you validate API JSON?

2. What is structural typing? How does it differ from nominal typing?  
   **Follow-ups:** Any downside of structural typing?

3. What happens to TypeScript types at runtime?  
   **Follow-ups:** Do enums/classes complicate that answer?

4. How does `tsc` differ from using Babel or SWC with TypeScript?  
   **Follow-ups:** How should CI be set up?

5. Why might excess property checks fire on an object literal but not on a variable with extra fields?

## Connections

1. How does structural typing relate to everyday JavaScript “duck typing”?
2. How does type erasure force a split between TypeScript types and Nest/zod validation?
3. How does the class/`instanceof` story connect to the prototypes unit from JavaScript fundamentals?
4. When someone confuses TS `typeof` in a type position with runtime `typeof`, which two “worlds” are they mixing?
5. How will excess property checks (next section) sit on top of structural typing without making TS nominal?
