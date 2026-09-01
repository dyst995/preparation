# `unknown` vs `any` — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `any` do to type checking for a value? What must you do before using an `unknown` value’s properties/methods?
- [ ] Is `any` assignable to `string` without narrowing? Is `unknown`?
- [ ] Why type `catch` variables as `unknown`? What is meant by `any` being “contagious”?
- [ ] `any` vs `unknown`.
- [ ] Why is casting `JSON.parse(s) as User` still risky?

## Predict / debug

Compile error or OK? State the result and explain why.

- [ ]
```ts
const u: unknown = 'x';
u.toUpperCase();
```

- [ ]
```ts
const a: any = 'x';
a.toUpperCase();
a.nope();
```

- [ ]
```ts
const u: unknown = 'x';
const s: string = u;
```

- [ ]
```ts
try {
  throw 'boom';
} catch (err) {
  console.log(err.message); // assume useUnknownInCatchVariables
}
```

- [ ] Diagnose:
```ts
const user = JSON.parse(body);
console.log(user.email.toLowerCase());
```

## Say it out loud

- [ ] Explain `unknown` vs `any` in 30–60 seconds as if an interviewer asked.
- [ ] What’s the difference between `any` and `unknown`? Follow-ups: Contagion? Assignability?
- [ ] Why does modern TypeScript prefer `unknown` for `catch` variables instead of `any`? Follow-ups: What can be thrown in JS? How do you narrow?
