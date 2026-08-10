# 12. Tie-backs to your experience

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

- Typed `useState`/`useReducer`/custom hooks in React and RN rely directly on generics and discriminated unions (loading/success/error state machines are everywhere in data-fetching code).
- NestJS DTOs are a textbook use case for `Omit`/`Partial`/`Pick` derived from Prisma/TypeORM entity types - a strong, concrete talking point for backend interviews.
- Declaration merging (`interface`) is the standard way to type Express's augmented `Request` object after auth middleware attaches a `user` property in a Nest app.

---
