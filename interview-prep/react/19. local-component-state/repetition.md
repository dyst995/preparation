# Local Component State — `useState` / `useReducer` — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is the default choice for component-owned UI state? Does passing state to a child via props mean it’s no longer local?
- [ ] Name three signals you’ve outgrown local state. What happens to local state when the owning component unmounts?
- [ ] When do you lift state to a parent while staying “local”? When might you pick `useReducer` still as local state? How can `key` interact with local state?
- [ ] Why is colocation a good default? Why is prop drilling 1 level usually fine but 4 levels a smell? Why lift to nearest parent instead of straight to Context?
- [ ] Compare local state vs shared client state, lift state vs duplicate state in siblings, and `useState` vs `useReducer` for local ownership.

## Predict / debug

- [ ] `SearchPage` has `query` state; navigate to `/about` and back — what’s `query`? State the result and explain why.
- [ ] Two sibling inputs each `useState` for the same logical draft — do they stay in sync? Parent lifts `query`; both children receive props — one source of truth? State the result and explain why.
- [ ] `<Editor key={docId} />` with internal state; `docId` changes — editor state? State the result and explain why.
- [ ] Filters reset every navigation; product wanted them sticky. Diagnose and give options. Team put `isTooltipOpen` in Redux. Push back.

## Say it out loud

- [ ] Explain local component state in 30–60 seconds as if an interviewer asked.
- [ ] When is local state enough, and when do you move it? Follow-ups: Prop drilling? Persistence?
- [ ] Is state passed as props still local? Explain.
