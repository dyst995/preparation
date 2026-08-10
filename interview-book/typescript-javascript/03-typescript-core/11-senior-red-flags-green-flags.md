# 11. Senior red flags / green flags

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Green flags interviewers love
- You describe TypeScript's typing as structural and erased, with a concrete `instanceof`-on-interface example of why that matters.
- You justify `type` vs `interface` with declaration merging / unions, not "my team just picked one."
- You reach for discriminated unions unprompted when describing UI state or API response modeling.
- You can write a generic function with a `keyof` constraint from memory.
- You explain `unknown` as "safe `any`" and can justify `catch (err: unknown)`.
- You have an opinion on `enum` vs union literals backed by a real tradeoff (bundle size vs namespacing).

### Red flags
- "Interfaces and types are basically the same, just use whichever" with no ability to name a real difference.
- Reaches for `any` immediately when a type is "annoying," rather than trying `unknown` + narrowing or a quick generic.
- Cannot explain why `typeof null === 'object'` matters for narrowing logic.
- Writes union types with all-optional fields instead of discriminated unions for clearly mutually-exclusive states.
- Unaware that `enum` produces runtime code while literal unions do not.

---
