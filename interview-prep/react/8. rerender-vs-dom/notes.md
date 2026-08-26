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

# Self-test

## Core recall

1. Does a re-render always mutate the DOM?
2. What does “re-render” mean precisely?
3. Without `memo`, does a child usually re-render when its parent does?
4. If child output is identical after re-render, what does commit do for that subtree?
5. What extra work does React still do if the function ran but DOM didn’t change?
6. How does `React.memo` differ from “diff found no DOM changes”?
7. Can React skip scheduling a re-render entirely? Give one case.
8. Does “rendered” in Profiler mean the DOM updated?

## Explain why

1. Why might React call `StaticChild` again even though it has no props and returns the same UI?
2. Why is “no DOM update” still not free without memo?
3. Why do people wrongly treat every re-render as a performance emergency?
4. Why does `memo` need shallow-equal props to help in the Parent/Child case?
5. Why can button text update while a sibling’s DOM stays untouched in one Parent update?
6. Why does `setState` with the same number often cause no re-render?

## Compare and contrast

1. Re-render vs DOM mutation  
2. Diff found no changes vs `React.memo` bailout  
3. Parent re-render cascading to child vs child `setState`  
4. CPU cost of calling a cheap child vs mutating DOM  
5. Profiler “commit” / paint intuition vs “render” count  
6. Identical element output vs new object props that look the same  

## Predict the behavior

1. Parent increments count; `StaticChild` returns `<p>Hi</p>` always; no memo. Did `StaticChild`’s function run? Did `<p>`’s DOM text change?

2. Same but `StaticChild = memo(() => <p>Hi</p>)`. Did the function run on Parent’s count update?

3. Child returns `<p>{Math.random()}</p>` (impure). Parent re-renders. DOM for that `p`?

4. `setCount(0)` when count is already `0`. Re-render scheduled?

## Debugging

1. Engineer: “Child re-rendered so we must have a DOM performance bug.” How do you push back?

2. Memoized child still runs every parent click; parent passes `onClick={() => ...}`. Why?

3. Profiler shows many renders but paint looks fine. Interpretation?

4. Someone wraps a tiny `<span>{label}</span>` in memo “to avoid DOM updates.” What’s misguided?

## Application

1. Explain in two sentences what happens to `StaticChild` on Parent click without memo.

2. Add `memo` to `StaticChild` and state the condition under which Parent clicks skip its render.

3. List the three layers: run fn / diff / DOM — and mark which `memo` can skip.

4. Write a one-liner interview distinction between re-render and DOM update.

## Interview questions

1. If a child’s output doesn’t change, does the DOM update?  
   **Follow-ups:** Does the child function still run? Role of `memo`?

2. What’s the difference between `React.memo` and a re-render that produces no DOM change?

3. Why do children re-render when parents re-render by default?

4. How would you verify whether a update touched the DOM vs only re-rendered?

5. When is skipping the render call worth it?

## Connections

1. How does this lock in render phase vs commit phase vocabulary?
2. How does reconciliation decide “no DOM work”?
3. How does purity make re-running unchanged children safe?
4. How does batching reduce how often this cascade runs?
5. How does the performance chapter build on this distinction?
