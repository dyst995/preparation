# Zustand — Minimal Client State Without Boilerplate

## What you need to know

Zustand keeps state in a **module-level store outside React**. Components subscribe with a hook and an optional **selector**. They re-render only when the **selected slice** changes (`Object.is` by default) — the fine-grained subscription **Context lacks**.

- **No Provider** required (import the hook anywhere).  
- Great for **shared client state** that updates more than Context likes.  
- **Not** a server-state cache — keep API data in [React Query](../21.%20server-state-react-query/notes.md).

Prerequisites: [Context](../20.%20context/notes.md), [four kinds of state](../18.%20four-kinds-of-state/notes.md), [useSyncExternalStore](../17.%20other-hooks/notes.md).

---

## Core model (preserved)

```jsx
import { create } from 'zustand';

const useUiStore = create((set, get) => ({
  isSidebarOpen: false,
  filters: { status: 'all', search: '' },
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSearch: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),
}));

function SidebarToggleButton() {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  return (
    <button onClick={toggleSidebar}>
      {isSidebarOpen ? 'Close' : 'Open'}
    </button>
  );
}

function SearchInput() {
  const search = useUiStore((state) => state.filters.search);
  const setSearch = useUiStore((state) => state.setSearch);
  return (
    <input value={search} onChange={(e) => setSearch(e.target.value)} />
  );
}
```

- **`create`** builds the store + hook.  
- **`set`** merges updates (immutable style — return new fields; don’t mutate nested objects in place if you want subscribers to see changes).  
- **`get`** reads current state inside actions.  
- **Selector** `(state) => state.isSidebarOpen` — subscribe to that value only.

`SidebarToggleButton` does **not** re-render when only `filters` change.

---

## Why this fixes Context’s re-render problem (preserved)

| Context | Zustand |
| --- | --- |
| Subscribe to whole Provider `value` | Subscribe to **selector result** |
| Any field change → all consumers | Unrelated field change → **skip** if selected value `Object.is`-equal |
| Split contexts / memo to mitigate | Selectors are the default tool |

Under the hood: **`useSyncExternalStore`** — concurrent-safe external store reads (same family as modern Redux bindings).

---

## No Provider (preserved)

Zustand stores are **importable hooks**. No tree wrap to introduce feature state — easy **incremental** adoption vs classic Redux Provider + store wiring.

(Tradeoff: store is a module singleton — testing may reset stores; SSR needs care if the store holds per-request data. For typical client UI flags, the simplicity wins.)

---

## Middleware: `persist` and `devtools` (preserved)

```jsx
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

const useSettingsStore = create(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'settings-storage' },
    ),
  ),
);
```

- **`persist`** — sync to `localStorage` (or custom storage) + rehydrate.  
- **`devtools`** — Redux DevTools inspection/time-travel without being Redux.

Compose middleware outward-in as needed.

---

## Selector gotchas (working knowledge)

```jsx
// BAD: new object every time → always "changed"
const filters = useUiStore((s) => ({ search: s.filters.search, status: s.filters.status }));
```

Selecting a **new object/array** every call breaks `Object.is` bail-out → re-render always. Fixes:

- Select primitives separately, or  
- Use Zustand’s **`shallow`** compare helper for object slices, or  
- Select one field at a time.

Actions/setters from the store are typically **stable** — selecting `toggleSidebar` alone is fine.

---

## When Zustand vs Redux Toolkit (preserved table)

| Signal | Lean |
| --- | --- |
| Small–medium, feature-scoped shared UI state (table filters/sort/selection) | **Zustand** |
| Don’t need rigid action/reducer discipline or heavy middleware | **Zustand** |
| Incremental add, no Provider ceremony | **Zustand** |
| Large cross-cutting domains, strong reducer testability, existing Redux culture | **Redux Toolkit** |
| Advanced async middleware (sagas/observables), audit-heavy action logs, large-team rigidity | **Redux Toolkit** |

Both are **client** stores. Neither replaces React Query for server cache.

---

## Zustand vs Context vs local state (chooser)

```text
Local to one component? → useState
Rare shared (theme)? → Context OK
Shared + frequent / many selective readers? → Zustand
Huge domain + RTK conventions? → Redux Toolkit
Fetched / stale-able? → React Query
```

---

## Common mistakes and misconceptions

1. Putting API lists in Zustand instead of RQ.  
2. `useStore()` with no selector → subscribe to **entire** state (re-render on any change).  
3. Returning new objects from selectors without shallow compare.  
4. Mutating nested state in `set` without copying.  
5. Expecting automatic React tree scoping — module store is global to the import graph.  
6. Using Zustand to avoid props one level down (still prefer local/lift).

---

## Connections to other concepts

```
shared client state (frequent)
  → Zustand selectors

Context limitation
  → no slice subscribe → Zustand

useSyncExternalStore
  → concurrent-safe subscriptions

React Query
  → server cache; Zustand → client UI

Redux Toolkit
  → heavier client alternative when domain demands it
```

---

## Interview perspective

**Q: How does Zustand avoid Context’s re-render problems?**

Preserved answer:

> Components subscribe with a **selector**; the store notifies only when that **selected value** changes, not on every store update. Built on `useSyncExternalStore` for concurrent safety. Context has no equivalent — any Provider value change re-renders all consumers unless you split contexts manually.

Also ready: no Provider; persist/devtools; when to pick RTK instead; selector object trap.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
