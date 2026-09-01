# Strict Mode, Unpacked — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Is `strict: true` one check or a bundle? Name the major flags `strict` turns on. Which two flags are usually called out as highest real-world impact?
- [ ] What does `strictNullChecks` change about `null`/`undefined`? What does `noImplicitAny` forbid?
- [ ] What does `strictPropertyInitialization` require of class fields? How is `catch (e)` typed with `useUnknownInCatchVariables`?
- [ ] Why is `strictNullChecks` often called the highest-impact flag?
- [ ] `strict: true` vs JS `"use strict"`.

## Predict / debug

Compile vs runtime? State the result and explain why.

- [ ]
```ts
// strictNullChecks on
function f(s: string) {
  return s.length;
}
f(null);
```

- [ ]
```ts
// noImplicitAny on
function f(x) {
  return x;
}
```

- [ ]
```ts
// strictPropertyInitialization on
class A {
  x: number;
}
```

- [ ]
```ts
// useUnknownInCatchVariables on
try {
} catch (e) {
  console.log(e.message);
}
```

- [ ]
```ts
class Svc {
  constructor(private readonly repo: Repo) {}
}
// Is `repo` OK under strictPropertyInitialization? Why?
```

## Say it out loud

- [ ] Explain TypeScript strict mode in 30–60 seconds as if an interviewer asked.
- [ ] What does `strict: true` actually do, and which flag matters most? Follow-ups: Second place? Nest property init?
- [ ] Explain `strictNullChecks` with a before/after example.
