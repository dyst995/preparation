# 10. Senior red flags / green flags

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Green flags interviewers love
- You explain hoisting as "declarations processed at compile time," not "code moves to the top."
- You immediately connect the `var`-in-loop bug to closures, not just memorize the fix.
- You can state the 4 `this`-binding rules with correct precedence, unprompted.
- You describe `class` as "prototypes with syntax and guardrails," not a separate OOP system.
- You default to `===` and explain the *one* accepted exception (`== null`).
- You know ESM tree-shaking is about static analyzability, not just "it's more modern."

### Red flags
- "Closures are when a function returns a function" (incomplete - misses scope capture).
- Cannot explain why `this` is `undefined` in a destructured/passed-as-callback method.
- Believes `class` fields and prototype methods are stored identically in memory.
- Says `==` and `===` are "basically the same, `===` is just stricter" without concrete coercion examples.
- Cannot explain why `NaN !== NaN` or gets flustered by it.

---
