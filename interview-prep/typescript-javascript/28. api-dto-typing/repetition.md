# Practical API DTO Typing — End to End — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What are the three usual layers: entity, request DTO, response DTO?
- [ ] Why doesn’t `Omit<User, 'passwordHash'>` remove the property from JSON? Why is `as UserResponseDto` on `res.json()` a trap?
- [ ] Why map to a **new** object instead of casting the entity? Why is returning `user` with return type `UserResponseDto` especially dangerous under structural typing?
- [ ] Entity vs Create DTO vs Response DTO. Compile-time `Omit` vs runtime `@Exclude` / explicit map.
- [ ] What does `whitelist` on ValidationPipe help prevent?

## Predict / debug

Predict the behavior. State the result and explain why.

- [ ]
```ts
const user = { id: '1', passwordHash: 'x', email: 'a@b.com' };
function pub(u: User): Omit<User, 'passwordHash'> {
  return u;
}
JSON.stringify(pub(user as User));
// Does passwordHash appear? Why?
```

- [ ]
```ts
return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
// Can passwordHash appear in this object’s JSON?
```

- [ ]
```ts
const data = (await res.json()) as UserResponseDto;
// If server sends passwordHash, is it on `data` at runtime?
```

- [ ] Production response includes `passwordHash` though controller return type is `Omit<User, 'passwordHash'>`. Diagnose the root cause.

- [ ] Extra field `isAdmin: true` in POST body gets saved on the user row. Diagnose and fix.

## Say it out loud

- [ ] Explain practical API DTO typing end to end in 30–60 seconds as if an interviewer asked.
- [ ] `Omit<User, 'passwordHash'>` response still leaks the hash. How? Structural prevention? Follow-ups: Nest-specific second layer? FE side?
- [ ] Why isn’t typing the API enough without runtime validation?
