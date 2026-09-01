# Conditional Types — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does `T extends U ? X : Y` mean?
- [ ] What is a distributive conditional type? What does “naked type parameter” matter for?
- [ ] What does `infer` do?
- [ ] Why does replacing a union member with `never` remove it from the union?
- [ ] Why wrap `T` as `[T]` to disable distribution?

## Predict / debug

What does this type resolve to? State the result and explain why.

- [ ]
```ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<'a' | 'b'>;
```

- [ ]
```ts
type Excl<T, U> = T extends U ? never : T;
type R = Excl<'x' | 'y' | 'z', 'y'>;
```

- [ ]
```ts
type Await1<T> = T extends Promise<infer U> ? U : T;
type R = Await1<Promise<Promise<string>>>;
```

- [ ]
```ts
type Box<T> = [T] extends [string] ? 'str' : 'other';
type R = Box<string | number>;
```

- [ ] Author expected `(string | number)[]` but got `string[] | number[]` from `T extends any ? T[] : never`. Diagnose and fix intent.

## Say it out loud

- [ ] Explain conditional types in 30–60 seconds as if an interviewer asked.
- [ ] What does `infer` do, and give a built-in example? Follow-ups: `Awaited`? Practical Nest/service use?
- [ ] Explain distributive conditional types. Follow-ups: How do `Exclude`/`Extract` use that? How to disable?
