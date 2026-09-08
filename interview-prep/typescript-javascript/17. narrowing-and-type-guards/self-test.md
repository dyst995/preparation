# Narrowing and Type Guards — Self-test

## Core recall

1. What is narrowing in TypeScript?
2. List the main built-in narrowing mechanisms.
3. What does `animal is Cat` mean as a return type?
4. What does `asserts x is string` mean?
5. Which typeof tag does `null` produce?
6. How do you narrow `string | string[]` to an array?
7. Why doesn’t `instanceof` work with interfaces?
8. What is the danger of truthiness narrowing for `string | null` when `''` is valid?

## Explain why

1. Why must type predicates be implemented carefully?
2. Why check `=== null` before treating `typeof x === 'object'` as a dictionary?
3. Why does an early `return` after a null check narrow the rest of the function?
4. Why is a custom predicate needed for validating `unknown` JSON?
5. Why might `'permissions' in user` be preferred over casting to `Admin`?
6. Why is `value as User` not a type guard?

## Compare and contrast

1. `typeof` vs `instanceof`
2. Type predicate vs assertion function
3. Type predicate vs type assertion (`as`)
4. Truthiness check vs `!= null`
5. `in` narrowing vs discriminant equality narrowing
6. `Array.isArray` vs `typeof === 'object'`

## Predict the output / checker result

Narrowed type in each branch? Compile error? Explain why.

1.
```ts
function f(x: string | null) {
  if (x === null) return;
  x.toUpperCase();
}
```

2.
```ts
function f(x: string | null) {
  if (typeof x === 'object') {
    x; // what is x here?
  }
}
```

3.
```ts
function f(x: string | number) {
  if (typeof x === 'string') return x.length;
  return x.toFixed(1);
}
```

4.
```ts
function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function f(v: unknown) {
  if (isStr(v)) v.toUpperCase();
}
```

5.
```ts
function assertStr(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error();
}
function f(v: unknown) {
  assertStr(v);
  v.toUpperCase();
}
```

6.
```ts
type A = { kind: 'a'; a: number };
type B = { kind: 'b'; b: string };
function f(x: A | B) {
  if (x.kind === 'a') return x.a;
  return x.b;
}
```

7.
```ts
function f(x: string | '') {
  if (x) {
    x; // ?
  } else {
    x; // ?
  }
}
```

## Debugging

1. Diagnose crash:
```ts
function read(name: object | null) {
  if (typeof name === 'object') {
    return name.toString();
  }
}
read(null);
```

2. Diagnose wrong narrowing intent:
```ts
function score(n: number | null) {
  if (n) return n + 1;
  return 0; // intended only for null, but also hits 0
}
```

3. Diagnose:
```ts
interface User { id: string }
function f(u: User | string) {
  if (u instanceof User) { /* … */ }
}
```

4. Diagnose unsoundness:
```ts
function isUser(v: unknown): v is { id: string } {
  return true;
}
```

## Application

1. Write `isNonEmptyString(v: unknown): v is string` that rejects non-strings and `''`.

2. Write `assertDefined<T>(v: T | null | undefined): asserts v is T`.

3. Given `type Result = { ok: true; value: string } | { ok: false; error: string }`, narrow with equality (no predicate) in a `print` function.

4. Write a predicate `isCat | isDog` style guard using `in` for `{ meow(): void } | { bark(): void }`.

5. Refactor a truthiness check that must allow `0` as valid input.

## Interview questions

1. Why is `typeof null === 'object'` a trap for narrowing?  
   **Follow-ups:** How do you structure checks? What about `undefined`?

2. What is a type predicate? When do you need one?  
   **Follow-ups:** How does it differ from `as T`?

3. Explain assertion functions vs predicates.  
   **Follow-ups:** When is throwing better than returning boolean?

4. Walk through how control-flow analysis narrows after early returns.

5. How do `in`, `instanceof`, and discriminants share a common idea?

## Connections

1. How do discriminant checks from the unions unit fit into this toolkit?
2. How does erasure force predicates for interface-shaped API data?
3. How does narrowing relate to exhaustiveness / `never`?
4. Why do Nest pipes/zod sit in the same “runtime proof → typed value” story as predicates?
5. When debugging “TS thinks this is still a union,” what CFA mistakes do you look for?
