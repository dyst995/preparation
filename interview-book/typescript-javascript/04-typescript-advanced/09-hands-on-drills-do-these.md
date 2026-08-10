# 09. Hands-on drills (do these)

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

- [ ] Implement `MyExclude<T, U>` and `MyExtract<T, U>` from scratch as conditional types and verify against a union of 3-4 types.
- [ ] Implement `DeepPartial<T>` as a recursive mapped type that makes nested object properties optional too, and test it against a 2-level-nested interface.
- [ ] Write a `.d.ts` file that augments Express's `Request` with a `user: User` property and use it in a mock Nest controller.
- [ ] Build a small generic `<Select<T>>` React component (`options: T[]`, `getLabel`, `getValue`, `onChange`) and use it with two different concrete types.
- [ ] Write a `useReducer` state machine (idle/loading/success/error) with a discriminated union of actions, including exhaustiveness checking in the reducer.
- [ ] Write `CreateUserDto`/`UpdateUserDto`/`UserResponseDto` classes with `class-validator` decorators for a small entity, then explain out loud why each is a class, not an interface.
- [ ] Turn `strictNullChecks` off in a `tsconfig.json` scratch project, write a function that crashes on `null`, and confirm it compiles; turn it back on and fix the resulting errors.

---
