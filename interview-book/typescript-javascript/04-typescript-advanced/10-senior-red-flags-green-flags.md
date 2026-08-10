# 10. Senior red flags / green flags

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Green flags interviewers love
- You can implement `Partial`/`Pick`/`Omit` from scratch as mapped types without hesitation.
- You use `infer` correctly in an example and connect it to `ReturnType`/`Awaited`.
- You know declaration merging is why NestJS's Express `Request` augmentation pattern works, mechanically, not just "that's how you do it."
- You catch the `useState` literal-widening trap before it's pointed out.
- You explain NestJS DTOs-as-classes via reflect-metadata and runtime existence, not "that's just the convention."
- You can name and justify at least 3 individual `strict` flags separately, not just "strict mode good."

### Red flags
- Cannot explain what `infer` does or has never used it, even at a reading level.
- Thinks utility types like `Partial`/`Omit` are special compiler magic rather than plain mapped types you could write yourself.
- Doesn't know why Nest DTOs are classes and guesses "just convention."
- Believes a compile-time `Omit<>` type alone prevents a sensitive field from ever appearing in a JSON response.
- Treats `strict: true` as an atomic on/off switch with no idea what's inside it.

---
