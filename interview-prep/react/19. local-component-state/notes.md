# Local Component State — `useState` / `useReducer`

## What you need to know

**Default home for UI state:** if a value is read and written by **one component** (and children it **explicitly** passes props/callbacks to), keep it in that component with `useState` or `useReducer`.

Don’t reach for Context, Zustand, or Redux until you’ve **outgrown** local state for clear reasons.

This unit is about **where state lives** in the tree. Hook mechanics live in [useState](../11.%20usestate/notes.md) / [other hooks — useReducer](../17.%20other-hooks/notes.md). Classification: [four kinds of state](../18.%20four-kinds-of-state/notes.md).

---

## What “local” means

| Local | Not local anymore |
| --- | --- |
| Dropdown `open` in `Menu` | Same `open` needed in distant `Header` and `Sidebar` with no shared parent owning it cleanly |
| Controlled input in `SearchBox` | Search query must drive a sibling route’s results **and** survive navigating away without URL/store |
| Modal `isOpen` owned by page that opens it | Global “any screen can open this modal” queue |

**Children via props still count as local** to the owning parent:

```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Suggestions query={query} /> {/* fine — still local ownership */}
    </>
  );
}
```

The source of truth is still `SearchBox`’s fiber. That’s not Context.

---

## Why local is the default

1. **Colocation** — state lives next to the UI that uses it; easier to delete/move.  
2. **No extra re-render blast radius** — updates don’t notify half the app.  
3. **Lifecycle matches UI** — unmount clears ephemeral UI (often what you want).  
4. **Less indirection** — no store keys, providers, or selectors for a boolean.

Interview posture: “I start local and lift only when sharing or persistence forces it.”

---

## `useState` vs `useReducer` (local choice)

| Prefer `useState` | Prefer `useReducer` |
| --- | --- |
| One or few independent fields | Many fields updated together |
| Simple setters | Named transitions / complex next-state rules |
| — | Want a pure reducer to unit-test |

Both are still **local** if they live in one component.

---

## Lifting state (still local to a parent)

When **two siblings** need the same value, lift to the **nearest common parent** — still local UI state, just higher:

```text
Parent (owns query)
├── SearchInput
└── ResultCount
```

That’s the right fix before Context. Context is for when the parent would be an awkward god-component or consumers are far away.

---

## Signals you’ve outgrown local state (preserved)

1. **Prop drilling 2–3+ levels** only to thread one value through intermediates that don’t care.  
2. **Unrelated distant components** need read/write without a natural shared parent.  
3. **Must persist across unmount / route changes** — local state is **destroyed** when the owner unmounts.

Also consider:

- Value is **server-owned** → React Query, not “lift to Redux.”  
- Value should be **bookmarkable** → URL search params (often better than a global store for filters).

---

## Persistence and remounting

```text
Mount SearchPage → useState('')
Navigate away → unmount → state gone
Come back → fresh ''
```

If that’s wrong for UX:

- Lift to a layout that stays mounted, or  
- URL / sessionStorage / Zustand persist, or  
- Server state cache (RQ) for fetched data  

Don’t be surprised when local state resets — that’s the model.

**`key` remount:** changing `key` on a component throws away its local state on purpose (reset form).

---

## Composition patterns that keep state local

- **Children as props / slots** — parent owns state; children render UI.  
- **Controlled vs uncontrolled** — parent owns value (controlled) vs internal `useState` until submit (uncontrolled/ref).  
- **Pass callbacks down** — `onOpen`, `onChange` — ownership stays up; no global store.

---

## Common mistakes and misconceptions

1. Putting every boolean in Redux/Zustand on sight.  
2. Using Context to avoid passing props one level.  
3. Treating “child reads it via props” as “needs global state.”  
4. Expecting local state to survive route unmounts.  
5. Duplicating the same local state in two siblings instead of lifting once.  
6. Lifting so high that the whole app re-renders for a tooltip — lift to the **nearest** sufficient parent.

---

## Connections to other concepts

```
four kinds → local UI
  → useState/useReducer here

outgrown local
  → Context / Zustand / Redux / URL / RQ

hooks useState unit
  → how the hook works

reconciliation key
  → intentional local state reset
```

---

## Interview perspective

**Q: When is local state enough? When do you lift or switch tools?**

> Default to `useState`/`useReducer` in the component that owns the UI. Passing props to children is still local. I lift to a common parent when siblings share it. I leave local state when I see deep prop drilling, distant unrelated consumers, or persistence across unmounts — then Context/Zustand/Redux/URL/RQ depending on whether it’s client shared or server data.

---

# Self-test

## Core recall

1. What is the default choice for component-owned UI state?
2. Does passing state to a child via props mean it’s no longer local?
3. Name three signals you’ve outgrown local state.
4. What happens to local state when the owning component unmounts?
5. When do you lift state to a parent while staying “local”?
6. When might you pick `useReducer` still as local state?
7. How can `key` interact with local state?
8. What’s a better home than Redux for “list from API” when local `useEffect`+`useState` spreads?

## Explain why

1. Why is colocation a good default?
2. Why is prop drilling 1 level usually fine but 4 levels a smell?
3. Why does route change wipe form drafts kept only in page `useState`?
4. Why isn’t “two components need it” automatically Zustand?
5. Why lift to nearest parent instead of straight to Context?
6. Why can resetting a form with `key={userId}` be desirable?

## Compare and contrast

1. Local state vs shared client state  
2. Props to children vs Context  
3. Lift state vs duplicate state in siblings  
4. `useState` vs `useReducer` for local ownership  
5. Local ephemeral UI vs URL-persisted filters  
6. Controlled child vs child with its own local state  

## Predict the behavior

1. `SearchPage` has `query` state; navigate to `/about` and back — what’s `query`?  
2. Two sibling inputs each `useState` for the same logical draft — do they stay in sync?  
3. Parent lifts `query`; both children receive props — one source of truth?  
4. `<Editor key={docId} />` with internal state; `docId` changes — editor state?

## Debugging

1. Filters reset every navigation; product wanted them sticky. Local state issue? Options?  
2. Team put `isTooltipOpen` in Redux. Pushback?  
3. Intermediate layout components only forward 5 props they don’t use. Signal?  
4. Sibling list and map show different selected ids. Cause?

## Application

1. Sketch `Accordion` with local `openId` state and item children.  
2. Refactor two siblings with duplicated `selectedId` by lifting.  
3. List three concrete UI states that should stay local in a dashboard.  
4. Write the “outgrown local state” checklist from memory.  
5. Decide: modal opened only from `OrdersPage` — local or global?

## Interview questions

1. When is local state enough, and when do you move it?  
   **Follow-ups:** Prop drilling? Persistence?

2. Is state passed as props still local? Explain.

3. How do you choose between lifting state and introducing Context?

4. Why does local state reset on navigation, and what are alternatives?

5. `useState` vs `useReducer` when both stay local?

## Connections

1. How does this implement “local UI state” from the four-kinds unit?
2. How do useState mechanics support this architectural default?
3. How does remount/key from reconciliation reset local state on purpose?
4. When outgrown, which later tools match which signals (drill vs distant vs server)?
5. How do controlled form patterns keep ownership local to a parent?
