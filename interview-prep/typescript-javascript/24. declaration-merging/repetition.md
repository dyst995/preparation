# Declaration Merging and Module Augmentation — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is declaration merging for interfaces? Do `type` aliases merge?
- [ ] What is module augmentation? What is global augmentation? Why does a file with `import` often need `declare global` to affect `Window` / `Express`?
- [ ] Does augmenting `Request` assign `req.user` at runtime?
- [ ] Why isn’t a local `interface Request { user: User }` enough in a Nest controller file?
- [ ] Declaration merging vs intersection type (`A & B`). Augmenting Express `Request` vs defining `AuthenticatedRequest = Request & { user: User }`.

## Predict / debug

What is the resulting type / what happens? State the result and explain why.

- [ ]
```ts
interface A { x: number }
interface A { y: string }
// Effective shape of A?
```

- [ ]
```ts
type A = { x: number }
type A = { y: string }
// What happens?
```

- [ ]
```ts
function f() {}
namespace f {
  export type Opts = { n: number };
}
// Is f.Opts valid? Is f callable?
```

- [ ] Augmented `req.user` but TypeScript still errors “Property 'user' does not exist on type 'Request'.” Diagnose likely causes.

- [ ] `user` is typed as always present, but public routes crash when reading `req.user.id`. Diagnose the type/runtime mismatch.

## Say it out loud

- [ ] Explain declaration merging and module augmentation in 30–60 seconds as if an interviewer asked.
- [ ] You need `req.user` typed on every Express request after auth, without touching `node_modules`. How? Follow-ups: Runtime? Optional vs required `user`?
- [ ] Why can’t you augment a `type` alias the same way?
