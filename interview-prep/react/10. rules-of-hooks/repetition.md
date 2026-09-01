# The Rules of Hooks — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What are the two primary Rules of Hooks? Why must hooks stay at the top level?
- [ ] Where are you allowed to call hooks? Why should custom hooks start with `use`?
- [ ] How do you run effect logic only when `isEnabled` is true? How do you give each list item its own `useState` legally?
- [ ] Can you call `setState` inside an event handler? Is that a hook call? Is conditionally rendering `<AdminPanel />` a Rules-of-Hooks violation?
- [ ] Why is `if (isAdmin) useEffect(…)` illegal but `useEffect(() => { if (!isAdmin) return; … })` legal? Compare conditional hook call vs conditional component mount.

## Predict / debug

- [ ] `if (!isAdmin) return null;` then `useAdminAudit()` below — valid? State the result and explain why.
- [ ] `isAdmin && <AdminPanel />` where `AdminPanel` uses hooks — valid? State the result and explain why.
- [ ] `for (const x of xs) useMemo(() => x, [x])` — valid? State the result and explain why.
- [ ] Lint: “React Hook useEffect is called conditionally.” Diagnose and fix. List rows used `useState` in parent `map`; weird state bugs when filtering. Diagnose and say the better structure.

## Say it out loud

- [ ] Explain the Rules of Hooks in 30–60 seconds as if an interviewer asked.
- [ ] You need a hook only for admin users. How do you structure this? Follow-ups: Child component approach? Why not `if (isAdmin) useX()`?
- [ ] How do you handle per-item hooks in a list?
