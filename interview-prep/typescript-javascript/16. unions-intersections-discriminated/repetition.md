# Unions, Intersections, and Discriminated Unions — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `A | B` mean? What does `A & B` mean?
- [ ] What is a discriminated union? What is a discriminant (tag)?
- [ ] On a union of objects, which properties can you access before narrowing?
- [ ] Why is `{ status: string; data?: User; error?: string }` a weaker model than a tagged union?
- [ ] Why should discriminant fields use literal types instead of `string`?
- [ ] What is the role of `never` in exhaustiveness checking?

## Predict / debug

Compile error or OK? If OK, what’s the narrowed type? State the result and explain why.

- [ ]
```ts
type T = { a: string } | { b: number };
function f(x: T) {
  console.log(x.a);
}
```

- [ ]
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

- [ ] What does this type resolve to, and why?
```ts
type U = string & number;
```

- [ ] Diagnose:
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

## Say it out loud

- [ ] Explain unions, intersections, and discriminated unions in 30–60 seconds as if an interviewer asked.
- [ ] Why are discriminated unions better than a single object with many optional fields? Follow-ups: Show invalid state the bag allows. How does narrowing differ?
- [ ] How does exhaustiveness checking with `never` work? Follow-ups: What happens when a new variant is added?
