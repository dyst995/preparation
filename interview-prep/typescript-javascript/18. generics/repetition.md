# Generics — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What problem do generics solve that `any` does not?
- [ ] What does `T extends Foo` mean? What is `keyof T`? What is an indexed access type `T[K]`?
- [ ] Can you `instanceof T` inside a generic function?
- [ ] Why is `firstElement<T>(arr: T[]): T | undefined` better than returning `any`?
- [ ] Why must a factory take `Ctor: new () => T` instead of only `<T>`?
- [ ] `key: string` + `any` return vs `K extends keyof T` + `T[K]`.

## Predict / debug

Inferred types / errors? State the result and explain why.

- [ ]
```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const a = first([1, 2]);
const b = first(['x']);
```

- [ ]
```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
getProp({ x: 1 }, 'y');
```

- [ ]
```ts
function label<T>(x: T) {
  return x.name;
}
```

- [ ] Diagnose:
```ts
function create<T>() {
  return new T();
}
```

## Say it out loud

- [ ] Explain generics in 30–60 seconds as if an interviewer asked.
- [ ] Why is `getProp<T, K extends keyof T>` better than `(obj: any, key: string) => any`? Follow-ups: What are `keyof` and `T[K]`?
- [ ] What can’t you do with `T` at runtime because of erasure?
