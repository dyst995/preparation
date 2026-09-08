# Profiling with React DevTools

## What you need to know

The **React DevTools Profiler** records **React commits** during an interaction and shows which components rendered, how long they took, and (often) **why** they rendered. It turns “the page feels slow” into evidence: wasted re-renders vs one expensive component vs something outside React (layout, network).

This is the practical half of the chapter’s golden rule: **measure first, then fix, then re-measure**.

Prerequisites: [re-render vs DOM](../8.%20rerender-vs-dom/notes.md), [React.memo](../25.%20react-memo/notes.md), [useMemo](../26.%20usememo/notes.md), [useCallback](../27.%20usecallback/notes.md), [batching](../6.%20batching/notes.md).

---

## Why the Profiler exists

Guessing leads to cargo-cult `memo`/`useCallback`. The Profiler answers:

- Did this interaction cause **many** components to render?  
- Did **one** component dominate duration?  
- Did components render that **should have bailed out**?  
- Was the problem even a React render issue?

Without that, you optimize the wrong layer.

---

## Profiler tab workflow (preserved)

1. Open **React DevTools → Profiler**.  
2. Click **record**, perform the **specific** interaction (click, scroll, keystroke), **stop**.  
3. Inspect **flame graph** / **ranked chart**:  
   - Each bar = a component that rendered in that **commit**.  
   - Width / color intensity ≈ **render duration**.  
   - **Gray** bars = did **not** re-render in that commit (bailed out, e.g. `memo`).  
4. Click a component → **why it rendered** (version-dependent): props changed, state changed, hooks changed, parent re-rendered, etc.  
5. Hunt for: renders **too often**, **disproportionate** duration, or a **cascade** from one state update through a huge subtree.

Optional settings (know they exist): record why each component rendered; hide commits below a duration threshold; compare two profiles after a fix.

---

## Mental model: interaction → commit(s) → bars

```text
User types in search
  → setState in some parent
  → React re-renders that subtree (render phase)
  → commit phase updates DOM
  → Profiler shows ONE commit (or several if multiple updates)
       flame: tree-shaped who-rendered-whom
       ranked: slowest components first
```

**Commit** here ≈ one React update flushed to the screen (Profiler’s unit of recording). Multiple rapid commits can mean separate updates (batching boundaries, async work, Strict Mode double work in dev — interpret carefully).

**Gray / did not render:** useful proof that `memo` worked — or that the component simply wasn’t in the updated subtree.

---

## Flame graph vs ranked chart

| View | Best for |
| --- | --- |
| **Flame graph** | Seeing **structure**: which parent dragged which children into rendering |
| **Ranked** | Finding the **slowest** components by duration quickly |

Use flame when the bug is “whole tree lit up.” Use ranked when “something is expensive and I need the top offenders.”

---

## “Why did this render?”

Typical reasons DevTools may show:

| Reason | Meaning |
| --- | --- |
| **Props changed** | At least one prop failed shallow equality (new object/fn common) |
| **State changed** | That component’s `useState`/`useReducer` updated |
| **Hooks changed** | Hook outputs / internal hook state changed (wording varies by version) |
| **Parent re-rendered** | Parent rendered and this child had no bailout (`memo` miss or not memoized) |
| **Context changed** | Consumed context value changed (if shown) |

This links directly to memo / unstable props / state placement diagnoses.

---

## What to look for (preserved table)

| Symptom in Profiler | Likely cause | Typical fix |
| --- | --- | --- |
| Component renders on every keystroke in an **unrelated** input | State too high (shared parent above unrelated siblings) | **Colocate** state lower |
| Large subtree re-renders when a **leaf** counter changes | No memo boundary; intermediates pass re-renders | Strategic **`React.memo`** + **stable props** |
| One commit **long** in a **single** component | Expensive sync work in render, or huge list | **`useMemo`** computation; **virtualize** list |
| Many **small** commits in rapid succession | Updates not batched as expected (older React / microtasks / multiple sources) | Check **batching**; consolidate updates; verify React 18 auto-batching in that context |

Also watch for:

- **High render count**, low duration → structural / state placement / memo.  
- **Low count**, high duration → algorithm, list size, layout (then Chrome Performance).  
- Profiler looks fine but UI still janky → **not** (only) React render: CSS, images, main-thread long tasks, network.

---

## React Profiler vs Chrome Performance

| Tool | Shows |
| --- | --- |
| **React Profiler** | Component render cost and re-render causes inside React |
| **Chrome Performance / Performance panel** | JS long tasks, **style/layout**, paint, FPS, scripting outside React |

Slow page + short React bars → dig into browser performance (layout thrashing, huge DOM, forced reflow). Long React bars → stay in React (computation, fan-out re-renders).

Interview answers that mention **both** sound senior.

---

## End-to-end investigation loop

1. **Reproduce** one concrete slow interaction.  
2. **Record** Profiler for that interaction only.  
3. **Classify:** too many components vs one slow component vs non-React.  
4. **Hypothesis** from “why rendered” + state location.  
5. **Smallest fix** (colocate → memo boundary → useMemo → virtualize…).  
6. **Re-record** — confirm fewer/faster commits, not just “I added memo.”

---

## Interview answer (preserved)

**Q: Walk me through how you'd investigate "this page feels slow" using React DevTools.**

> “First I reproduce the specific interaction that feels slow with the Profiler recording. I look at the flame graph for that commit — which components rendered, how long each took, and whether components that shouldn’t have re-rendered did. If I see a big subtree re-rendering because of an unrelated state change, I look at where that state lives and whether it should be colocated lower in the tree, or whether a `memo` boundary with stable props would stop the cascade. If instead one component itself is slow (not a re-render count problem, but a duration problem), I look inside it for expensive unmemoized computation, or check the Chrome Performance tab for layout thrashing or a huge unvirtualized list.”

---

## Common mistakes and misconceptions

1. Profiling the whole session instead of one interaction.  
2. Optimizing before reading flame/ranked data.  
3. Treating every yellow bar as “need useMemo” without classifying count vs duration.  
4. Ignoring gray bars (proof of bailouts).  
5. Forgetting Strict Mode / dev builds are slower — still useful for *relative* patterns.  
6. Assuming React Profiler catches CSS/layout jank.  
7. Adding memo everywhere after seeing one parent re-render without checking state colocation first.

---

## Connections to other concepts

```
measure first (chapter 0)
  → Profiler is how you measure React render cost

state too high
  → flame shows siblings lighting up on keystroke
  → colocate (prop-drilling / local state lessons)

unstable props
  → “props changed” every time
  → useMemo / useCallback / memo chain

expensive render
  → ranked: one fat bar
  → useMemo / virtualize

many commits
  → batching chapter
```

---

## Interview perspective

Be ready to:

1. Narrate the record → flame/ranked → why-rendered loop.  
2. Map symptoms → colocate / memo / useMemo / virtualize / batching.  
3. Know when to leave React DevTools for Chrome Performance.  
4. Emphasize re-measure after the fix.  
5. Sound measurement-first, not memo-first.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
