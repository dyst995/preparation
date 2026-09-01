# How Hooks Work Mechanically — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Where does a function component’s hook state live? How does React match a hook call on re-render to stored state?
- [ ] Why do the Rules of Hooks exist (one sentence)? Why isn’t the variable name `count` enough to find the right `useState`?
- [ ] What goes wrong if you skip a hook call between renders? Can you put an `if` *inside* `useEffect`? Why is that different?
- [ ] Do custom hooks get their own fiber? What happens to hook state when the component fiber remounts?
- [ ] Compare conditional hook call vs conditional logic inside an effect, and custom hook vs component (regarding the hook list).

## Predict / debug

- [ ] State the result and explain why.
```jsx
function C({ on }) {
  const [a, setA] = useState(0);
  if (on) useState(1);
  const [b, setB] = useState(2);
}
```
What happens when `on` flips true → false?

- [ ] `if (!data) return null;` then `useState` below — first render has `data`, second doesn’t. State the result and explain why.
- [ ] Always call `useEffect`; inside, `if (!id) return;` — hook count stable? State the result and explain why.
- [ ] Dev: “Rendered more hooks than during the previous render.” Diagnose and fix. State from “first useState” seems to show up in “second useState” after a refactor that wrapped a hook in a condition. Explain via slots.

## Say it out loud

- [ ] Explain how hooks work mechanically in 30–60 seconds as if an interviewer asked.
- [ ] Why can’t hooks be called conditionally or inside loops? Follow-ups: Custom hooks? How do you conditionally run an effect?
- [ ] How are hooks stored and looked up on re-render?
