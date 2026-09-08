# Strict Mode, Unpacked — Self-test

## Core recall

1. Is `strict: true` one check or a bundle?
2. Name the major flags `strict` turns on.
3. What does `strictNullChecks` change about `null`/`undefined`?
4. What does `noImplicitAny` forbid?
5. What does `strictPropertyInitialization` require of class fields?
6. How is `catch (e)` typed with `useUnknownInCatchVariables`?
7. What do `noImplicitThis` and `strictBindCallApply` roughly guard?
8. Which two flags are usually called out as highest real-world impact?

## Explain why

1. Why is `strictNullChecks` often called the highest-impact flag?
2. Why does TS widen/`any`-hole untyped parameters without `noImplicitAny` matter?
3. Why does `getLength(null)` compile without `strictNullChecks` but crash at runtime?
4. Why use constructor parameter properties in Nest under `strictPropertyInitialization`?
5. Why should `!` definite assignment be used sparingly?
6. Why type catch as `unknown` instead of `any`?

## Compare and contrast

1. `strict: true` vs JS `"use strict"`  
2. `strictNullChecks` off vs on for `let s: string = null`  
3. Implicit `any` vs explicit `any` under `noImplicitAny`  
4. `users: User[] = []` vs `users!: User[]`  
5. `strictFunctionTypes` concern vs `strictNullChecks` concern  
6. `useUnknownInCatchVariables` vs annotating every catch yourself without the flag  

## Predict compile vs runtime

1.
```ts
// strictNullChecks on
function f(s: string) {
  return s.length;
}
f(null);
```

2.
```ts
// noImplicitAny on
function f(x) {
  return x;
}
```

3.
```ts
// strictPropertyInitialization on
class A {
  x: number;
}
```

4.
```ts
// useUnknownInCatchVariables on
try {
} catch (e) {
  console.log(e.message);
}
```

5.
```ts
class Svc {
  constructor(private readonly repo: Repo) {}
}
// Is `repo` OK under strictPropertyInitialization? Why?
```

## Debugging

1. Legacy project: `strict` on causes thousands of null errors. What’s the migration mindset?

2. Nest service: `private client: ApiClient` errors “not initialized.” Fixes?

3. Callback assigned to a wider handler type breaks only after enabling `strictFunctionTypes`. What class of bug did you catch?

4. `this` in a detached method is implicitly `any` until `noImplicitThis`. What’s the design fix?

5. Team wants “strict but not null checks.” What do you argue?

## Application

1. Rewrite `getLength` to accept `string | null` safely under `strictNullChecks`.

2. Annotate a function parameter that failed `noImplicitAny`.

3. Fix a class field under `strictPropertyInitialization` three ways (default, `!`, constructor).

4. Write a `catch` block that handles `unknown` safely (Error vs other).

5. Show a `tsconfig` snippet with `"strict": true`.

## Interview questions

1. What does `strict: true` actually do, and which flag matters most?  
   **Follow-ups:** Second place? Nest property init?

2. Explain `strictNullChecks` with a before/after example.

3. What is `noImplicitAny` and why do teams enable it?

4. How does `strictPropertyInitialization` show up in Nest/DI code?

5. What does `useUnknownInCatchVariables` change in day-to-day code?

## Connections

1. How does `strictNullChecks` force the narrowing unit’s techniques?
2. How does `noImplicitAny` / catch-`unknown` reinforce the unknown-vs-any unit?
3. How does Nest DTO/DI code interact with `strictPropertyInitialization`?
4. Why doesn’t `strict` replace runtime validation at HTTP boundaries?
5. How might React `useState`/`props` optional fields interact with null checks?
