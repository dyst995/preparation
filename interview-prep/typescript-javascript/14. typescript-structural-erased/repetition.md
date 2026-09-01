# TypeScript's Type System: Structural and Erased — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is structural typing in TypeScript? What is nominal typing, in contrast?
- [ ] What does type erasure mean?
- [ ] Why can’t you write `value instanceof SomeInterface`? Why can `value instanceof SomeClass` work?
- [ ] What does `tsc` do that Babel/SWC often do not?
- [ ] Why isn’t `JSON.parse(s) as User` a runtime guarantee?
- [ ] Compile-time type safety vs runtime validation.

## Predict / debug

For each: does it type-check? What runs at runtime? Explain why. For debug items, diagnose the false confidence.

- [ ]
```ts
interface Point { x: number; y: number }
function f(p: Point) {}
const a = { x: 1, y: 2, z: 3 };
f(a);
```

- [ ]
```ts
interface Point { x: number; y: number }
function f(p: Point) {}
f({ x: 1, y: 2, z: 3 });
```

- [ ]
```ts
interface User { id: string }
function check(u: unknown) {
  return u instanceof User; // ?
}
```

- [ ] Diagnose false confidence:
```ts
type User = { id: string; email: string };
async function loadUser(res: Response): Promise<User> {
  return res.json();
}
```

- [ ] Diagnose Nest confusion:
“I typed the body as `CreateUserDto` interface, so invalid JSON can’t reach my service.” What’s wrong?

## Say it out loud

- [ ] Explain TypeScript’s structural, erased type system in 30–60 seconds as if an interviewer asked.
- [ ] What is structural typing? How does it differ from nominal typing?  
  **Follow-ups:** Any downside of structural typing?
- [ ] What happens to TypeScript types at runtime?  
  **Follow-ups:** Do enums/classes complicate that answer?
