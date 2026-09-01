# Reconciliation: The Diffing Algorithm — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Why doesn’t React use a general O(n³) tree diff? What are React’s two main reconciliation heuristics?
- [ ] What happens when the element type at a position changes? What happens when type is the same but `key` changes?
- [ ] Without keys, how does React match list children? What goes wrong with `key={index}` when you prepend an item? When is index-as-key acceptable?
- [ ] Why do keys exist if React already has array order? Why does row-local `useState` “move” to the wrong todo with index keys?
- [ ] Compare same-type update vs different-type remount, and stable `id` key vs index key.

## Predict / debug

- [ ] State the result and explain why.
```jsx
{flag ? <input key="a" /> : <input key="b" />}
```
Does focus/state inside the input survive toggling `flag`?

- [ ] State the result and explain why.
```jsx
{flag ? <Editor /> : <Viewer />}
```
Does `Editor`’s `useState` survive `flag` true→false→true?

- [ ] List keyed by index; item at index 0 has local `expanded=true`; prepend a new item. What is expanded after reconcile? State the result and explain why.
- [ ] Todo text inputs show the wrong todo’s text after sorting. Diagnose and fix.
- [ ] Form state clears every time the user toggles “edit mode” between two different components. Diagnose and fix.

## Say it out loud

- [ ] Explain reconciliation in 30–60 seconds as if an interviewer asked.
- [ ] Why does React need `key`, and what breaks without a stable key? Follow-ups: Duplicate keys? When is index OK?
- [ ] Walk through the index-as-key prepend bug.
