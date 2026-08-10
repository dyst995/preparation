# 09. Senior red flags / green flags

> Source: `interview-prep/typescript-javascript/02-async-event-loop.md`

### Green flags interviewers love
- You immediately mention "microtask queue fully drains before the next macrotask" without prompting.
- You explain `async/await` as sugar over Promises/`.then()`, not a separate magic mechanism.
- You catch the sequential-`await` performance bug on sight and fix it with `Promise.all`.
- You bring up `AbortController`/race conditions unprompted when discussing search-as-you-type or fast navigation.
- You treat "fire and forget" async calls as a smell requiring an explicit `.catch()`.

### Red flags
- Says `setTimeout(fn, 0)` "runs immediately" or "runs before Promises."
- Believes `async/await` makes code "actually run in parallel" by default.
- Cannot explain why `.forEach` with an `async` callback doesn't wait.
- No mental model for what happens to an error thrown inside a `.then()` with no matching `.catch()`.
- Thinks React Native has a fundamentally different async/event-loop model than the browser.

---
