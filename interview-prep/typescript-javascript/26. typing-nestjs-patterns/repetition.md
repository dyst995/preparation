# Typing NestJS Patterns Precisely — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Why are Nest DTOs classes instead of interfaces?
- [ ] What does `ValidationPipe` + `transform: true` do to a body? What does `whitelist: true` do?
- [ ] Why can’t `@IsEmail()` attach meaningfully to an `interface`? Why is `dto: CreateUserDto` on `@Body()` insufficient alone for security/validation?
- [ ] What is the risk of only using `Omit<User, 'passwordHash'>` on responses?
- [ ] DTO `class` vs DTO `interface` in Nest. `Omit` / mapped types vs `@Exclude` / serializer.

## Predict / debug

Predict the behavior / resulting typing. State the result and explain why.

- [ ] `interface CreateUserDto { @IsEmail() email: string }` — what goes wrong conceptually?

- [ ] ValidationPipe off; controller has `@Body() dto: CreateUserDto`; client sends `{ email: 123 }`. What does TypeScript guarantee at runtime?

- [ ] Entity has `passwordHash`; controller `return userEntity` with only a return type `Omit<User, 'passwordHash'>`. Can JSON still include `passwordHash`?

- [ ] `this.config.get<number>('PORT')` and env has `PORT=3000` (string). What is the runtime typeof without extra parsing?

- [ ] Extra fields like `role: 'admin'` in POST body get saved. Diagnose what pipe option helps.

## Say it out loud

- [ ] Explain typing NestJS patterns in 30–60 seconds as if an interviewer asked.
- [ ] Why are NestJS DTOs written as classes instead of TypeScript interfaces? Follow-ups: What role does `ValidationPipe` play? What about response leakage?
- [ ] Explain Create DTO vs entity vs response DTO.
