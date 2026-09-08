# `unknown` vs `any` — Self-test

## Core recall

1. What does `any` do to type checking for a value?
2. What must you do before using an `unknown` value’s properties/methods?
3. Is `any` assignable to `string` without narrowing? Is `unknown`?
4. Name three ways `any` commonly enters a codebase.
5. What does `JSON.parse` typically return, and what’s the safer immediate type?
6. Why type `catch` variables as `unknown`?
7. What is meant by `any` being “contagious”?
8. Does `unknown` prevent you from *passing* the value around before narrowing?

## Explain why

1. Why can `a.foo.bar` compile with `a: any` but crash at runtime?
2. Why doesn’t `unknown` allow the same?
3. Why is casting `JSON.parse(s) as User` still risky?
4. Why is `noImplicitAny` important?
5. Why is error handling a particularly good place for `unknown`?
6. Why can one `any` parameter poison a whole module’s inferred types?

## Compare and contrast

1. `any` vs `unknown`
2. `unknown` vs `object`
3. Narrowing `unknown` vs asserting `as T`
4. `catch (e: unknown)` vs `catch (e: any)`
5. `any` vs generics for “works with many types”
6. Validating with zod vs `as User` after parse

## Predict the output / checker result

Compile error or OK? Explain why.

1.
```ts
const u: unknown = 'x';
u.toUpperCase();
```

2.
```ts
const a: any = 'x';
a.toUpperCase();
a.nope();
```

3.
```ts
const u: unknown = 'x';
const s: string = u;
```

4.
```ts
const a: any = 'x';
const s: string = a;
```

5.
```ts
function f(x: unknown) {
  if (typeof x === 'number') return x.toFixed(1);
}
```

6.
```ts
try {
  throw 'boom';
} catch (err) {
  console.log(err.message); // assume useUnknownInCatchVariables
}
```

## Debugging

1. Diagnose:
```ts
const user = JSON.parse(body);
console.log(user.email.toLowerCase());
```

2. Diagnose contagion:
```ts
function getConfig(raw: any) {
  return raw.settings;
}
const port = getConfig(load()).port;
```

3. Diagnose:
```ts
catch (e) {
  res.status(500).send(e.message);
}
```

4. Team disabled `noImplicitAny` because “callbacks are annoying.” What regresses?

## Application

1. Rewrite a helper `function parseUser(json: string): User` using `unknown` + a type predicate (sketch).

2. Write a `toErrorMessage(err: unknown): string` that handles `Error`, string, and fallback.

3. Wrap an untyped library function `legacyGet(): any` behind `function safeGet(): unknown` and show the call-site narrowing.

4. Given `zod` conceptually, sketch `UserSchema.parse(JSON.parse(s))` vs `JSON.parse(s) as User`.

## Interview questions

1. Why does modern TypeScript prefer `unknown` for `catch` variables instead of `any`?  
   **Follow-ups:** What can be thrown in JS? How do you narrow?

2. Where does `any` sneak in even when people try to avoid it?  
   **Follow-ups:** What do you do about `JSON.parse`?

3. What’s the difference between `any` and `unknown`?  
   **Follow-ups:** Contagion? Assignability?

4. When, if ever, is `any` acceptable?

5. How do `unknown` and runtime validation relate to type erasure?

## Connections

1. How does this unit depend on the narrowing toolkit?
2. How does erasure make `unknown` at boundaries necessary for JSON/HTTP?
3. How do generics offer a better alternative than `any` for reusable functions?
4. How does Nest/zod fit the `unknown → validated T` pipeline?
5. What’s the difference between this “top type” discussion and union modeling of *known* alternatives?
