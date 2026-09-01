# Enums vs Union-of-Literals — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What runtime artifact does a regular `enum` produce? What is reverse mapping, and which enums have it?
- [ ] Do string literal union types add runtime code? What’s a typical default for API role/status fields in modern TS?
- [ ] What is a `const enum`, and what’s the main caveat?
- [ ] Why are literal unions friendlier for REST JSON?
- [ ] String enum vs string literal union.

## Predict / debug

State the result and explain why.

- [ ]
```ts
enum Role {
  Admin,
  Editor,
}
console.log(Role.Admin, Role[0]);
```

- [ ]
```ts
enum Role {
  Admin = 'ADMIN',
}
console.log(Role[0]); // ?
```

- [ ]
```ts
enum Role {
  Admin = 'ADMIN',
}
const r: Role = 'ADMIN'; // ok or error?
```

- [ ]
```ts
const ROLES = { Admin: 'admin' };
type Role = (typeof ROLES)[keyof typeof ROLES];
// what is Role roughly?
```

- [ ] API returns `"admin"` but code checks `role === Role.Admin` where `enum Role { Admin }` (numeric). Diagnose what’s wrong.

## Say it out loud

- [ ] Explain enums vs union-of-literals in 30–60 seconds as if an interviewer asked.
- [ ] Why might a team prefer string literal unions over `enum`? Follow-ups: Bundle size? JSON interop? When keep enums?
- [ ] Explain numeric enum reverse mapping. Follow-ups: Why is it confusing?
