# `type` vs `interface` — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Name three capabilities `type` has that `interface` does not.
- [ ] What is declaration merging? Can `type` aliases declaration-merge?
- [ ] Why does declaration merging exist, and who benefits?
- [ ] `interface extends` vs `type` intersection (`&`).
- [ ] Why might Nest auth typing use an interface merge on `Request` instead of casting `req as any`?

## Predict / debug

Does it compile? What is the resulting type? Explain why.

- [ ]
```ts
interface A {
  x: number;
}
interface A {
  y: string;
}
const v: A = { x: 1, y: 'a' };
```

- [ ]
```ts
type A = { x: number };
type A = { y: string };
```

- [ ]
```ts
interface Point {
  x: number;
  y: number;
}
const f = (p: Point) => {};
f({ x: 1, y: 2, z: 3 });
```

- [ ] Diagnose and fix:
```ts
type Request = { headers: Headers };
type Request = { user: User }; // author wanted to add user
```

## Say it out loud

- [ ] Explain `type` vs `interface` in 30–60 seconds as if an interviewer asked.
- [ ] Give a concrete reason to prefer `interface` over `type`, beyond convention. Follow-ups: Nest/Express example? Can `type` do the same?
- [ ] When do you choose `type` instead? Follow-ups: Unions? Mapped types?
