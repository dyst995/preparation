# Perceived Performance Beyond Raw Computation

## What you need to know

**Perceived performance** is how fast the app *feels* to a human — not only how many milliseconds a function or render took.

Two related goals:

| Goal | Question |
| --- | --- |
| **Compute / load fast** | Did we reduce real work (CPU, bytes, RTT)? |
| **Feel fast** | Did the user get immediate, stable, progressive feedback? |

You can improve the second **without** changing a single millisecond of backend or render cost — skeletons, optimistic UI, reserved space, instant click feedback. Interviewers treat that as a senior signal.

Measure both: Profiler/bundle timings **and** user-centric metrics (LCP, CLS, TTI, INP-ish responsiveness).

Prerequisites: [useTransition / deferred](../32.%20use-transition-deferred-value/notes.md), [avoiding waterfalls](../31.%20avoiding-waterfalls/notes.md), [code splitting](../30.%20code-splitting/notes.md).

---

## Why perception ≠ stopwatch

Users judge:

- Did something happen **when I clicked**?  
- Did the screen **jump** while loading?  
- Did I stare at a **blank void** or see structure?  
- Did useful content appear **progressively**?

A 400ms fetch with a skeleton + disabled button often *feels* faster than a 300ms fetch with a blank screen and a dead-looking button — even if wall-clock work is similar or worse.

Raw optimization still matters for scale and battery; perception techniques are **not** an excuse to ignore real bottlenecks — they’re a **parallel** toolkit.

---

## Skeleton screens vs spinners

**Spinner:** “something is happening” — low information, often centered void.

**Skeleton:** placeholder shapes matching the eventual layout (gray bars where title/avatar/rows will be).

```jsx
function Profile() {
  const { data, isLoading } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile });
  if (isLoading) return <ProfileSkeleton />; // same approximate layout
  return <ProfileView data={data} />;
}
```

Why it feels faster:

- Reserves **spatial structure** early → less cognitive “what am I waiting for?”  
- Pairs with **avoiding layout shift** if skeleton ≈ final size  
- Communicates progress without implying the app froze  

Not always better: tiny actions may only need a button spinner; huge inaccurate skeletons can feel fake.

---

## Optimistic UI

Update the UI **as if the mutation succeeded**, then reconcile with the server.

```jsx
async function onToggleTodo(id) {
  setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  try {
    await api.toggle(id);
  } catch {
    // rollback + toast
    setTodos(/* previous */);
  }
}
```

With React Query: `onMutate` optimistic cache update + `onError` rollback + `invalidate` on settle.

**Feel:** instant checkbox. **Risk:** must handle failure/rollback/conflicts honestly. Wrong domain for money transfers without careful design — great for likes, toggles, many drafts.

Distinct from skeletons: skeletons wait for **read**; optimistic assumes **write** success early.

---

## Progressive rendering

Don’t block the whole view on the slowest dependency.

```text
Bad:  wait(user + profile + posts + ads) → paint everything
Good: paint shell + user header as ready → posts when ready → …
```

Techniques:

- Parallel fetches + **per-section** loading states ([waterfalls](../31.%20avoiding-waterfalls/notes.md))  
- Stream / SSR progressive HTML where the stack supports it  
- Above-the-fold first; defer below-fold widgets (`lazy`, intersection)  
- Show cached RQ data immediately while revalidating (`placeholderData` / stale-while-revalidate feel)

Same total bytes can feel much faster if **first useful paint** arrives earlier.

---

## Avoiding layout shift (CLS)

**Cumulative Layout Shift (CLS):** Core Web Vital — how much visible content jumps as things load.

Causes: images without dimensions, ads/embeds, late fonts, skeletons that don’t match final size, injecting banners above content.

Fixes:

```html
<img width="320" height="180" src="..." alt="" />
```

```css
.aspect {
  aspect-ratio: 16 / 9;
}
```

- Reserve space for async blocks (min-height / skeleton matching final).  
- Avoid inserting toasts/banners that shove content without reserved region.  
- Font strategies (`font-display`, fallback metrics) to limit text reflow.

Feeling “fast” includes feeling **stable** — jumpiness reads as broken even when LCP is fine.

---

## Instant feedback on interaction

```jsx
function SaveButton({ onSave }) {
  const [pending, setPending] = useState(false);
  async function handleClick() {
    setPending(true); // immediate — before await
    try {
      await onSave();
    } finally {
      setPending(false);
    }
  }
  return (
    <button disabled={pending} onClick={handleClick}>
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}
```

Rules of thumb:

- Disable double-submit immediately.  
- Show pending affordance **synchronously** in the click handler path.  
- Don’t wait for the network to acknowledge the click visually.

Pairs with `useTransition`’s `isPending` for **render** lag, and with optimistic UI for **data** lag — same theme: never look dead after input.

---

## Metrics that match perception (from interview answer)

| Metric | Roughly captures |
| --- | --- |
| **LCP** (Largest Contentful Paint) | When main content appears |
| **CLS** | Visual stability |
| **TTI** / interactivity metrics | When the page responds usefully |
| **INP** (Interaction to Next Paint) | Responsiveness to clicks/keypresses |

Use alongside React Profiler — Profiler explains *component* cost; CWV explains *user experience* of load/interaction.

---

## Interview answer (preserved)

**Q: Is a faster raw computation always the right performance fix?**

> “Not necessarily — perceived performance often matters more to users than raw computation time. Showing a skeleton screen or optimistic result immediately, giving instant feedback on click before a request resolves, and avoiding layout shift as content loads can make an app *feel* dramatically faster without changing a single millisecond of actual work. I treat ‘make it feel fast’ and ‘make it compute fast’ as related but distinct goals, and profile/measure user-perceived metrics (like Largest Contentful Paint, Cumulative Layout Shift, Time to Interactive) alongside raw render timings.”

---

## Common mistakes and misconceptions

1. Only optimizing render ms while the UI feels blank/jumpy.  
2. Spinner-only loading for large contentful pages.  
3. Optimistic UI without rollback → lying UI on failure.  
4. Skeletons that don’t match size → worse CLS.  
5. Waiting on network before disabling a button → double submits + “dead” UI.  
6. Claiming perception work replaces measuring real bottlenecks.  
7. Progressive UI that still waterfalls requests accidentally.

---

## Connections to other concepts

```
feel fast
  ← skeletons / optimistic / progressive paint / CLS / instant feedback

compute fast
  ← memo, virtualize, split, parallel fetch, algorithms

useTransition isPending
  ← perceived responsiveness during expensive renders

stale-while-revalidate (RQ)
  ← show something now, refresh in background

measure first
  ← Profiler + CWV / field metrics, not vibes alone
```

---

## Interview perspective

Be ready to:

1. Separate “feel fast” vs “compute fast.”  
2. Name skeletons, optimistic UI, progressive render, CLS, instant feedback.  
3. Tie to LCP/CLS/TTI.  
4. Give a concrete example where perception wins without faster API.  
5. Still know when raw speed is the real fix (every-keystroke jank, huge lists).

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
