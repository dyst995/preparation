# Fiber: The Unit of Work — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What two meanings does “Fiber” have in React? How does a fiber differ from a React element?
- [ ] What problem did the stack reconciler have? How does Fiber make rendering interruptible at a high level?
- [ ] What are the **current** and **work-in-progress** trees? What is `alternate` for?
- [ ] Why keep two trees instead of mutating the on-screen tree during render? Why doesn’t pausing mid-render leave a half-updated DOM?
- [ ] Is Fiber the same as concurrent mode / concurrent features? Compare Fiber architecture vs `useTransition` / concurrent rendering.
- [ ] Where do hooks’ state conceptually live?

## Predict / debug

- [ ] Large low-priority render in progress; user types in an input marked urgent. What is Fiber *for* in that scenario? State the result and explain why.
- [ ] WIP render is abandoned. Does the **current** tree still match what’s on screen? State the result and explain why.
- [ ] After a successful commit, which tree is “on screen”? State the result and explain why.
- [ ] Dev thinks `startTransition` *is* Fiber. Diagnose the misconception and correct it.
- [ ] Belief that yielding means the DOM shows partial Fiber progress. Diagnose and fix the mental model.

## Say it out loud

- [ ] Explain Fiber in 30–60 seconds as if an interviewer asked.
- [ ] What problem does Fiber solve that the old stack reconciler didn’t? Follow-ups: Is Fiber concurrent mode? What is double buffering?
- [ ] Explain current vs work-in-progress.
