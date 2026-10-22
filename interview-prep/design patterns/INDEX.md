# Design patterns

Named solutions to **recurring design problems** — not libraries, not language syntax. This track is the interview bar: you can **name** a pattern, **draw** the shape, **say when you would not use it**, and **point at your stack** (NestJS DI, TypeORM repositories, React composition, payment adapters).

It is **not** a dump of all 23 Gang of Four patterns. Units cover the ones fullstack / RN interviewers actually probe, plus how they show up in Nest and React.

---

## Study units

| # | Folder | Focus |
|---|---|---|
| 1 | [intro](./1.%20intro/notes.md) | What a pattern is, categories, composition vs inheritance, when naming helps vs cargo-cult |
| 2 | [creational](./2.%20creational/notes.md) | Singleton, Factory, Builder (module-as-singleton, Nest default scope) |
| 3 | [structural](./3.%20structural/notes.md) | Adapter, Decorator, Facade, Proxy — and GoF Bridge vs the RN Bridge |
| 4 | [behavioral](./4.%20behavioral/notes.md) | Observer, Strategy, Command, Chain of Responsibility, Template Method, State |
| 5 | [nest-backend](./5.%20nest-backend/notes.md) | DI, provider scopes, Repository, module boundaries, request pipeline as a chain |
| 6 | [react-frontend](./6.%20react-frontend/notes.md) | Composition, observer in UI state, strategy by variant, HOC vs hooks, DTO adapters |

Same files as TypeScript / JavaScript units: `notes.md`, `self-test.md`, `answers.md`, `repetition.md`.

---

## Why this order

Intro first so you do not treat patterns as a vocabulary quiz. Creational / structural / behavioral are the classic map interviewers expect. Nest and React last because that is where you **prove** you used the idea, not only named it.

---

## How to study

1. Read `notes.md`. Say the 30-second version out loud before moving on.
2. `self-test.md` notes closed.
3. `answers.md` only after you attempt.
4. Next day: `repetition.md`.

If an interviewer asks “what design patterns do you use?”, lead with **Dependency Injection**, **Repository**, **Adapter** (payments / native SDKs), **Observer** (events / store), **Strategy** (swap an algorithm), and **Chain of Responsibility** (Nest pipeline). Name others only if the follow-up needs them.

---

## Progress tracker

- [ ] 1 Intro
- [ ] 2 Creational
- [ ] 3 Structural
- [ ] 4 Behavioral
- [ ] 5 Nest / backend
- [ ] 6 React / frontend
