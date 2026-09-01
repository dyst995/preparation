# Controlled vs Uncontrolled Inputs — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What makes an input controlled vs uncontrolled? `value` vs `defaultValue`.
- [ ] When should you prefer controlled? When uncontrolled? Why are file inputs effectively uncontrolled?
- [ ] Why must a controlled input update state in `onChange`? Why can large controlled forms hurt performance?
- [ ] Why does `useState(user?.name)` often cause the warning, and why is `?? ''` a fix?
- [ ] What `value` value makes React treat the input as uncontrolled? Why is mixing `value` and `defaultValue` a smell?

## Predict / debug

- [ ] State the result and explain why:

```jsx
<input value="hi" />
```

Can the user type? (no `onChange`)

- [ ] State `undefined`, then `setState('a')` with `value={state}`. Warning? Why?
- [ ] Uncontrolled input with `defaultValue="x"`. Does the parent re-render each keystroke by default? Why?
- [ ] Warning: uncontrolled to controlled; state init `user?.email`. Diagnose and fix.
- [ ] Input won’t accept typing; `value={form.name}` but forgot `onChange`. Diagnose.

## Say it out loud

- [ ] Explain controlled vs uncontrolled inputs in 30–60 seconds as if an interviewer asked.
- [ ] What causes the "changing an uncontrolled input to controlled" warning, and how do you fix it? Follow-up: when each? Follow-up: file inputs?
- [ ] Why might you choose uncontrolled inputs for a large form? How do you reset an uncontrolled input?
