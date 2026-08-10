# 11. Tie-backs to your experience

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

- Debugging stale closures in `useEffect`/`useCallback` dependency arrays directly uses this chapter's closure model - you can describe a real bug where a callback captured an old prop/state value.
- NestJS's decorator + DI system leans on prototypes, `Reflect.metadata`, and constructor parameter types - a concrete example ties classes/prototypes knowledge to backend work.
- React Native's Hermes engine is still just a JS engine - the same scope/closure/`this`/coercion rules apply identically to app code running there as they do in a browser or Node.

---
