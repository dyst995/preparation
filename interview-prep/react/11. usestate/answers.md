# `useState` in Depth — Answers

## Core recall

1. Only on the **first render** of that hook slot (that fiber instance).
2. React **bails out** — typically **no re-render**.
3. `useState(() => expensive())` — function called once on mount.
4. The argument expression still **runs every render**; result is just discarded after init.
5. Whenever next state **depends on** previous state (and in async/stale-closure-prone code).
6. **No** — it schedules an update; new value appears on a later render.
7. **No** re-render (`Object.is` true).
8. **Yes** re-render (different reference).

## Explain why

1. Both reads use the same closed-over `count`, scheduling the same next value twice.
2. So React can **defer** the call until it actually needs the initial value once — not evaluate a heavy expr every render.
3. Same reference ⇒ bail-out; mutation isn’t detected.
4. Timeout may run after many renders; closed-over `count` can be old; updater receives latest pending state.
5. Initial argument is mount-only seed, not a live binding to props.
6. Deep compare would be expensive/unpredictable; React relies on **immutable updates** + reference changes.

## Compare and contrast

1. **Value:** replace with this value. **Functional:** compute from latest pending state.
2. **`useState(x)`:** compute `x` every render. **`useState(() => x)`:** compute once on mount.
3. **Same primitive:** bail out. **New object same fields:** re-render.
4. **Multiple:** independent slots, simple updates. **One object:** fewer hooks, careful immutable merges.
5. **Seed once:** local copy diverges. **Controlled:** parent owns the value every render.
6. **Schedule:** queue update. **Read in handler:** still old render’s state unless updater/effect.

## Predict the behavior

1. **1**  
2. **2**  
3. **Once** (mount only)  
4. **11 times** (mount + 10 re-renders) — every render evaluates `buildBigArray()`  
5. **Typically no useful re-render** (same ref returned) — UI may stay at 0; mutation anti-pattern  
6. **No** re-render (bail out)

## Debugging

1. Use `setCount(c => c + 1)` twice (or once with +2).  
2. Sync with effect, make controlled, or `key` remount when identity changes — don’t expect init to track props.  
3. Setting same boolean reference/value — use `setOn(o => !o)` or `setOn(!on)` carefully; `setOn(on)` no-ops if unchanged.  
4. Yes — switch to lazy `useState(() => exp())`.  
5. Mutating then setting same ref ⇒ bail-out / shared mutation bugs — copy then set.

## Application

1.
```jsx
const [data, setData] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('k') || 'null');
  } catch {
    return null;
  }
});
```

2.
```jsx
setCount((c) => c + 1);
setCount((c) => c + 1);
setCount((c) => c + 1);
```

3.
```jsx
setState((s) => ({ ...s, count: s.count + 1 }));
```

4.
```jsx
<button onClick={() => setCount(count)}>noop</button>
// if count unchanged, bail out
```

5. “Depend on previous → functional updater; otherwise a plain next value is fine.”

## Interview questions

1. **Spoken:** Batching/closures make value-form multi-updates collapse; functional form composes on pending state and is safer async.  
   **Follow-ups:** +1 vs +2 example; setTimeout stale count.

2. **Spoken:** Pass `() => initial` so expensive setup runs once on mount, not every render.

3. **Spoken:** Bail-out if `Object.is` equal — same ref skips render; new ref with same data still re-renders; mutate-in-place + same ref fails.

4. **Spoken:** No — same state by `Object.is` skips re-render.

5. **Spoken:** Multiple `setState`s in one event/async tick batch; functional updaters still apply in order within the batch.

## Connections

1. Each `useState` is one positional slot storing the current value / queue of updates.
2. Without functional form, batched value updates share one stale snapshot.
3. Bail-out ⇒ no render phase work ⇒ no DOM for that update.
4. New state references make children/memo see changes; mutation hides them.
5. `useReducer` centralizes complex next-state logic with a single dispatch — same immutability/bail-out ideas.
