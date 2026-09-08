# Unions, Intersections, and Discriminated Unions — Self-test

## Core recall

1. What does `A | B` mean? What does `A & B` mean?
2. What is a literal type? Give an example.
3. What is a discriminated union?
4. What is a discriminant (tag)?
5. On a union of objects, which properties can you access before narrowing?
6. What does `string & number` evaluate to, and why?
7. What is the role of `never` in exhaustiveness checking?
8. Why are discriminated unions usually declared with `type`, not `interface`?

## Explain why

1. Why can’t you read `state.data` on `FetchState` without checking `status` first?
2. Why is `{ status: string; data?: User; error?: string }` a weaker model than a tagged union?
3. Why does `assertNever(state)` in `default` fail to compile when a new variant is added?
4. Why should discriminant fields use literal types instead of `string`?
5. Why does intersecting two object types with conflicting property types go wrong?
6. Why is exhaustiveness checking valuable in large codebases?

## Compare and contrast

1. Union vs intersection.
2. Discriminated union vs optional-field “state” object.
3. `status: 'success' | 'error'` on one object vs separate variants with those literals.
4. `switch` without `default` vs `default: assertNever(...)`.
5. `'meow' in a` narrowing vs discriminant-field narrowing (when you’d use each).
6. `type A = B | C` vs two interfaces (what you can’t do).

## Predict the output / checker result

Compile error or OK? If OK, what’s the narrowed type? Explain why.

1.
```ts
type T = { a: string } | { b: number };
function f(x: T) {
  console.log(x.a);
}
```

2.
```ts
type T = { a: string } | { b: number };
function f(x: T) {
  if ('a' in x) console.log(x.a);
}
```

3.
```ts
type U = string & number;
```

4.
```ts
type S =
  | { tag: 'a'; x: number }
  | { tag: 'b'; y: string };

function f(s: S) {
  if (s.tag === 'a') return s.x;
  return s.y;
}
```

5.
```ts
type S =
  | { tag: 'a'; x: number }
  | { tag: 'b'; y: string };

function f(s: S) {
  switch (s.tag) {
    case 'a':
      return s.x;
    case 'b':
      return s.y;
    default:
      const _e: never = s;
      return _e;
  }
}
// Later someone adds { tag: 'c'; z: boolean } to S but forgets a case.
```

6.
```ts
type Bad = { status: string; data?: number };
const ok: Bad = { status: 'success', error: 'nope' as any };
```
(Is `Bad` preventing invalid states? Comment on intent vs what the type allows — adjust if the snippet wouldn’t compile; explain the modeling issue.)

## Debugging

1. Diagnose:
```ts
type State = {
  status: 'loading' | 'success' | 'error';
  data?: User;
  error?: string;
};
function show(s: State) {
  if (s.status === 'success') return s.data!.name;
}
```

2. Diagnose: narrowing not working —
```ts
type Ev = { type: string; payload: unknown };
```

3. Diagnose:
```ts
type A = { id: string };
type B = { id: number };
type C = A & B;
// authors expected { id: string | number }
```

4. `render` compiles after adding `'cancelled'` to the union but crashes at runtime on that state. What did they likely omit?

## Application

1. Rewrite this bag as a discriminated union:
```ts
type FormState = {
  mode: string;
  values?: Record<string, string>;
  serverError?: string;
};
// intended modes: editing (values required), submitting (values required),
// error (serverError required), success (no extra fields)
```

2. Write `assertNever` and a `switch` on a three-variant `Shape` union (`circle`/`square`/`triangle`) that is exhaustive.

3. Model `Result<T, E>` as `Ok | Err` with a discriminant; write a helper `unwrap` that narrows or throws.

4. Show one case where `&` is the right tool (compose mixins), not `|`.

## Interview questions

1. Why are discriminated unions better than a single object with many optional fields?  
   **Follow-ups:** Show invalid state the bag allows. How does narrowing differ?

2. Explain union vs intersection with examples.  
   **Follow-ups:** What is `string & number`?

3. How does exhaustiveness checking with `never` work?  
   **Follow-ups:** What happens when a new variant is added?

4. What makes a good discriminant property?  
   **Follow-ups:** Why not `status: string`?

5. How do you narrow a `Cat | Dog` without a shared tag?

## Connections

1. Why does this pattern typically use `type` aliases from the type-vs-interface unit?
2. How does discriminated-union narrowing preview the general narrowing unit (`typeof`, predicates)?
3. How does encoding valid states in the type system reduce runtime checks / bugs in React fetch UI or Nest response mapping?
4. How is `never` here related to the idea of “this code shouldn’t run”?
5. When would you still use optional fields instead of a full tagged union?
