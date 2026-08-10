# 05. Zustand - minimal client state without boilerplate

> Source: `interview-prep/react/03-state-data-fetching.md`

### Core model

Zustand stores state **outside React** in a plain module-level store object, and components subscribe to it via a hook with an optional **selector function** - only re-rendering when the selected slice changes (comparing with `Object.is` by default, similar to how `useState` bails out).

```jsx
import { create } from 'zustand';

const useUiStore = create((set, get) => ({
  isSidebarOpen: false,
  filters: { status: 'all', search: '' },
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSearch: (search) => set((state) => ({ filters: { ...state.filters, search } })),
}));

// Only re-renders when isSidebarOpen changes - not when filters change.
function SidebarToggleButton() {
  const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  return <button onClick={toggleSidebar}>{isSidebarOpen ? 'Close' : 'Open'}</button>;
}

// Only re-renders when filters.search changes.
function SearchInput() {
  const search = useUiStore((state) => state.filters.search);
  const setSearch = useUiStore((state) => state.setSearch);
  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}
```

### Why this solves Context's re-render problem

Because each component picks its own selector, Zustand can compare *just that selected value* between renders and skip re-rendering the component if it's unchanged - even though other unrelated fields in the same store changed. This is the "fine-grained subscription" capability Context fundamentally lacks (Section 3).

### No Provider needed

Unlike Context or Redux (classic), Zustand stores are just importable hooks - no wrapping the tree in a `<Provider>`. This is a major reason teams reach for it over Redux for smaller, feature-scoped shared state: **zero setup ceremony**, easy to introduce incrementally into an existing codebase without restructuring the component tree.

### Middleware: `persist` and `devtools`

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
      { name: 'settings-storage' }   // localStorage key
    )
  )
);
```

- `persist` - automatically syncs the store to `localStorage` (or another storage engine) and rehydrates on load.
- `devtools` - wires the store into Redux DevTools for time-travel/inspection, even though it's not Redux.

### When Zustand is the right call vs Redux

| Signal | Lean towards |
|---|---|
| Small-to-medium, feature-scoped shared state (e.g., a data table's filters/sort/selection shared across a few sibling components) | Zustand |
| No need for strict action/reducer discipline, middleware ecosystem, or time-travel debugging | Zustand |
| Want to avoid Provider wrapping / boilerplate for a quick, incremental addition | Zustand |
| Large, cross-cutting app state with many interacting domains, strict testability requirements for reducers, or an existing Redux investment/team convention | Redux Toolkit |
| Need advanced middleware (sagas/observables for complex async flows), strict action logging for audits, or a large team convention that benefits from Redux's rigid structure | Redux Toolkit |

### Interview question

**Q: How does Zustand avoid the re-render problems Context has?**

> "Zustand components subscribe via a selector function, and the store only notifies subscribers when their *specific selected value* changes - not whenever any part of the store changes. Under the hood this is built on `useSyncExternalStore`, so it's also safe for concurrent rendering. Context has no equivalent - every consumer re-renders on any Provider value change regardless of what it actually reads, unless you manually split contexts."

---
