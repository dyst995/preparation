# Narrowing and Type Guards — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is narrowing in TypeScript? List the main built-in narrowing mechanisms.
- [ ] What does `animal is Cat` mean as a return type? What does `asserts x is string` mean?
- [ ] Which typeof tag does `null` produce?
- [ ] Why must type predicates be implemented carefully?
- [ ] Type predicate vs type assertion (`as`).
- [ ] Truthiness check vs `!= null`.

## Predict / debug

Narrowed type in each branch? Compile error? State the result and explain why.

- [ ]
```ts
function f(x: string | null) {
  if (x === null) return;
  x.toUpperCase();
}
```

- [ ]
```ts
function f(x: string | null) {
  if (typeof x === 'object') {
    x; // what is x here?
  }
}
```

- [ ] Diagnose crash:
```ts
function read(name: object | null) {
  if (typeof name === 'object') {
    return name.toString();
  }
}
read(null);
```

- [ ] Diagnose unsoundness:
```ts
function isUser(v: unknown): v is { id: string } {
  return true;
}
```

## Say it out loud

- [ ] Explain narrowing and type guards in 30–60 seconds as if an interviewer asked.
- [ ] Why is `typeof null === 'object'` a trap for narrowing? Follow-ups: How do you structure checks? What about `undefined`?
- [ ] What is a type predicate? When do you need one? Follow-ups: How does it differ from `as T`?
