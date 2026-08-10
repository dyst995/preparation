# 08. Section G - Live coding / whiteboard prompts

> Source: `interview-prep/react/06-interview-questions.md`

For each, actually write the code before reading the solution sketch.

**G1. Implement a `useDebouncedValue(value, delayMs)` custom hook from scratch.**
> See chapter 02, Section 8 for the reference implementation (state + effect with `setTimeout` and cleanup via `clearTimeout`).

**G2. Fix this buggy counter that double-increments incorrectly in a batched handler:**
```jsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
}
```
> Replace with functional updater form: `setCount(c => c + 1)` twice, so each reads the latest pending value instead of the same stale closure value.

**G3. Given a list rendered with `key={index}`, and a bug report that editing text in one row after deleting an earlier row shows the wrong text - diagnose and fix.**
> Diagnosis: index-based keys cause React to reuse the DOM/state at each position rather than tracking identity, so deleting row 0 shifts row 1's data into position 0 while row 0's fiber/state (and any uncontrolled input value) stays attached to that position rather than following the data. Fix: use a stable unique `id` from the data as the key instead of the array index.

**G4. Build a `useFetch(url)` hook that avoids race conditions when `url` changes quickly.**
```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [url]);

  return { data, error, isLoading };
}
```
> Key point to say out loud: the cleanup function aborts the in-flight request when `url` changes again (or on unmount), preventing a slower, older request from resolving after a faster, newer one and overwriting fresh data with stale results.

**G5. Given a `React.memo`-wrapped `Row` component that still re-renders every time its parent state changes, find and fix the bug in this code:**
```jsx
function List({ items }) {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {items.map(item => (
        <Row key={item.id} item={item} onSelect={(id) => console.log(id)} />
      ))}
    </>
  );
}
```
> Bug: `onSelect={(id) => console.log(id)}` creates a new function reference every render of `List`, defeating `Row`'s `memo`. Fix: wrap it in `useCallback` (with an empty dependency array if it doesn't close over anything that changes), or hoist it outside the component if it truly needs no closure at all.

**G6. Write a `createSlice` for a `cart` domain supporting `addItem`, `removeItem`, and `clearCart`, using Immer-style updates.**
```jsx
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload);
    },
    removeItem(state, action) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});
```
> Key point: `state.items.push(...)` looks like a mutation but is safe because Immer intercepts writes to the draft proxy and produces a new immutable state object under the hood.

**G7. Implement a minimal accessible modal with focus trap and Escape-to-close (sketch, not full production code).**
> See chapter 05, Section 8 for the reference implementation pattern (store previously focused element, focus the dialog on open, restore focus on close, handle Escape key).

**G8. Given a component that fetches `user`, then a child fetches `profile` only after `user` resolves, then a grandchild fetches `posts` only after `profile` resolves - identify and fix the waterfall if none of the three actually depend on each other's data.**
> See chapter 04, Section 7 - lift all three `useQuery` calls to fire in parallel at a common point (since all only need `userId`, known immediately), instead of gating each one behind the previous one's render/mount.

---
