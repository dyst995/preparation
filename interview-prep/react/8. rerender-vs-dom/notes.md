# Does a Re-render Always Touch the DOM?

## What you need to know

**No.** A **re-render** means React ran your component function again in the **render phase** and produced a new element tree. A **DOM update** means the **commit phase** mutated the document.

Those are different:

| Term | Means |
| --- | --- |
| **Re-render** | Component function (or class `render`) executed; new elements computed |
| **DOM mutation** | Commit applied host changes (text, attributes, insert/remove nodes) |

Reconciliation may find **no differences** → **zero DOM writes** for that subtree, even though the function ran and React did **diff work**.

`React.memo` is a **further** optimization: skip calling the function at all when props are shallow-equal — avoiding render **and** that subtree’s diff cost, not only DOM writes.

Prerequisites: [render vs commit](../2.%20render-vs-commit/notes.md), [reconciliation](../4.%20reconciliation/notes.md), [pure components / memo](../5.%20pure-components/notes.md).

---

## The Parent / StaticChild example (preserved)

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <StaticChild />
      {/* Without memo: StaticChild's function runs again on every Parent re-render.
          If output is identical, commit applies no DOM changes for that subtree.
          React still did the work of calling it and diffing. */}
    </div>
  );
}
```

What happens on click:

1. `Parent` re-renders (state changed) → button text DOM **does** update.  
2. `StaticChild` **re-renders** (default: children re-render when parent does).  
3. If `StaticChild` returns the same host description as last time → **no DOM mutation** for its nodes.  
4. With `React.memo(StaticChild)` and stable/empty props → step 2 may be **skipped** entirely.

---

## Three layers of “work” (interview precision)

```text
1. Run component function          ← "re-render"
2. Diff new elements vs previous   ← reconciliation CPU
3. Mutate DOM                      ← commit host updates
```

| Situation | (1) Run fn | (2) Diff | (3) DOM |
| --- | --- | --- | --- |
| Parent state changes; child output identical; no memo | Yes | Yes (cheap if same) | No for unchanged child nodes |
| Child wrapped in `memo`; props shallow-equal | **No** | Skipped for that bailout | No |
| Child text/props actually change | Yes | Yes | **Yes** |
| `setState` same primitive (`Object.is`) | Often **no** schedule | — | — |

Performance conversations fail when people say “it re-rendered” meaning “the DOM thrashed.” Profiler “rendered” ≠ paint/DOM.

---

## Why children re-render when parents do

By default, when a parent re-renders, React re-renders **descendants** as part of rendering that subtree (unless they bail out via `memo` / `PureComponent` / context selectivity / etc.).

That is **not** because React thinks their props changed — it’s the default traversal. Props might be referentially new (`style={{}}`, inline functions) even when “logically” the same, which also defeats `memo`.

State updates **in the child** also re-render that child (and its descendants), independent of the parent.

Context: consumers re-render when the selected context value changes — another path besides parent render.

(Deeper “what re-renders when” tactics live in performance notes; this unit locks the vocabulary.)

---

## `memo` vs “diff found nothing”

Preserved interview distinction:

> Re-render + identical output ⇒ **no DOM update**, but the function **ran** and React **diffed**.  
> **`React.memo`** ⇒ may **skip the function call** when props are shallow-equal ⇒ skips that render work and the associated child work, not only the DOM write.

So:

- “No DOM change” ≠ “memo worked.”  
- “Memo worked” ⇒ usually no render call for that component (on that update).  
- Diffing identical trees is often cheap for small subtrees; expensive children are when `memo` / splitting state pays off — **measure with Profiler**.

---

## Bailout before re-render: same state

If you `setState` with a value `Object.is`-equal to the current state (e.g. `setCount(5)` when count is already `5`), React typically **does not schedule a re-render**. That’s another “no DOM touch” path — because **render never ran**.

New object/array identity always differs even with same contents → re-render schedules.

---

## Common mistakes and misconceptions

1. Equating “re-rendered” with “DOM updated” or “user saw a flash.”  
2. Wrapping everything in `memo` because “re-renders are bad” without profiling.  
3. Thinking React skips child function calls automatically when child JSX “looks static.”  
4. Confusing commit skipping DOM writes with skipping render-phase work.  
5. Using Profiler “render” counts as proof of DOM thrashing.

---

## Connections to other concepts

```
setState / parent render
  → child function runs (re-render)
    → reconcile
      → maybe no DOM ops

memo / PureComponent
  → may skip child function entirely

render phase vs commit phase
  → this unit names the gap between them

batching
  → fewer times this whole pipeline runs

purity
  → safe to re-run child functions even when DOM won’t change
```

---

## Interview perspective

**Q: If a child component’s output doesn’t change, does the DOM update?**

Preserved answer:

> Not necessarily. Re-render means the function ran and produced a new element tree — if reconciliation finds it equivalent, commit does no DOM mutations. That’s different from `React.memo`, which skips calling the function when props are shallow-equal, avoiding render and diff work, not just the DOM write.

Follow-ups: Does the child function still run without memo? What does the Profiler show? When would you add memo?

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
