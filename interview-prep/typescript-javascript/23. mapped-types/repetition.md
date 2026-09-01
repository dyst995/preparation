# Mapped Types — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is the basic syntax of a mapped type? How do you make every property optional via a mapped type?
- [ ] How do you remove optionality with a mapped modifier? How do you add and remove `readonly` in a mapped type?
- [ ] What does key remapping `as` allow? How can remapping to `never` filter keys?
- [ ] Why isn’t `Partial` magic — and why does that matter in an interview?
- [ ] Does `readonly` in a mapped type freeze the object at runtime? Mapped types vs index signatures (`{ [key: string]: V }`).

## Predict / debug

What is the resulting type? State the result and explain why.

- [ ]
```ts
type T = { a: string; b?: number };
type R = { [K in keyof T]-?: T[K] };
```

- [ ]
```ts
type T = { name: string };
type R = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
```

- [ ]
```ts
type T = { a: 1; _h: 2 };
type R = { [K in keyof T as K extends `_${string}` ? never : K]: T[K] };
```

- [ ] `type ReadonlyDeep = Readonly<User>` still allows `user.address.city = …` where `address` is an object. Diagnose why.

## Say it out loud

- [ ] Explain mapped types in 30–60 seconds as if an interviewer asked.
- [ ] How would you implement `Readonly<T>`, and what does `readonly` prevent? Follow-ups: Runtime? Nested objects?
- [ ] How are `Partial` and `Required` implemented? Follow-ups: What do `?` and `-?` mean?
