
# 03 - State & Data Fetching

> Goal: Build a precise, defensible mental model for local state, Context, Redux Toolkit, Zustand, and React Query/TanStack Query - and a decision framework for "which one, when" that matches your actual production stack.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Classify any piece of state into one of: local UI state, shared client state, global app state, or server state.
2. Explain why "server state" is fundamentally different from client state and why treating it like client state causes bugs.
3. Explain Context's re-render pitfall precisely and know 3+ mitigations.
4. Explain Redux Toolkit's core concepts: store, slice, reducer, `createSlice`, immutability via Immer, `createAsyncThunk`, selectors, and normalization.
5. Explain Zustand's model: no provider, selector-based subscriptions, middleware (persist, devtools), and why it avoids Redux boilerplate.
6. Explain React Query's core concepts: query keys, cache, staleness vs garbage collection, background refetching, mutations, invalidation, optimistic updates.
7. Justify, with concrete tradeoffs, why a modern stack splits server state (React Query) from client state (Redux/Zustand) instead of putting API data in Redux.
8. Answer "why three state tools" without sounding like over-engineering - articulate the boundaries precisely.
9. Recognize and fix common anti-patterns: prop drilling, over-using Context for frequently-changing values, duplicating server data into client stores, redundant `useEffect` + `fetch` when React Query already solves it.

---

## 1. The four kinds of state - classify before you pick a tool

Before reaching for any library, classify the state. This classification *is* the answer to "why did you choose X" in interviews.

| Kind | Definition | Example | Typical home |
|---|---|---|---|
| **Local UI state** | Owned and used by one component (and maybe its direct children) | Input value, whether a dropdown is open, form field focus | `useState`/`useReducer` in that component |
| **Shared client state** | Client-only data needed by multiple, possibly distant, components | Current theme, sidebar collapsed/expanded, selected filters, modal open/closed, auth token (client-side flag), multi-step wizard progress | Context (rarely changing) or Zustand/Redux (frequently changing / complex) |
| **Global app state** | Cross-cutting, app-wide, often long-lived, sometimes needs middleware/devtools/time-travel | Auth/session, feature flags, app-wide notifications/toasts queue, complex multi-slice domain state | Redux Toolkit |
| **Server state** | Data that is *owned by the server*, fetched over the network, can go stale, can be updated by other clients, needs caching/revalidation | List of users, a user's profile, product catalog, orders | React Query / TanStack Query |

### Why this classification matters more than "which library is better"

Nearly all real state-management bugs and interview follow-up questions trace back to **misclassifying state** - most commonly, treating **server state as if it were client state** (see Section 4). Get the classification right, and the "which tool" question mostly answers itself.

### Interview question

**Q: How do you decide where a new piece of state should live?**

> "First I ask what kind of state it is. If it's local to one component's UI, it's `useState`. If it's server data - fetched from an API, can go stale, might be updated elsewhere - it goes in React Query regardless of how many components need it, because caching and revalidation are the actual hard problems, not just 'sharing a value.' If it's genuinely client-only and shared across distant parts of the app, I decide between Context, Zustand, or Redux based on update frequency and complexity - Context for rarely-changing values, Zustand for lightweight shared state, Redux Toolkit when the domain is complex enough to benefit from centralized reducers, middleware, and devtools."

---

## 2. Local component state - `useState`/`useReducer`

Default choice. If a value is read and written by a single component (and children it explicitly passes callbacks/props to), it almost never needs anything more sophisticated.

**Signal you've outgrown local state:**
- Prop drilling more than 2-3 levels just to share one value.
- Multiple unrelated components need to read/write the same value without a natural parent-child relationship.
- The value needs to persist across route changes or component unmounts (local state is destroyed when the component unmounts).

---

## 3. Context - what it's good for, and its sharp edges

### What Context actually does

`createContext` + `Provider` lets you avoid prop drilling by letting any descendant read a value via `useContext` without it being threaded through every intermediate component's props.

### The re-render pitfall (know this cold)

**Every component that calls `useContext(MyContext)` re-renders whenever the Provider's `value` changes - even if the consuming component only cares about part of that value**, and even if the new value is shallowly identical in the parts that component reads.

```jsx
// BAD: value is a new object literal every render of AppProvider -> EVERY consumer re-renders
// on every AppProvider render, regardless of what value actually changed.
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}
```

Every render of `AppProvider` creates a brand-new `{ user, setUser, theme, setTheme }` object, so `Object.is` comparison always finds a new reference - **all consumers re-render**, even a component that only reads `theme` when only `user` changed.

### Mitigations

**1. Memoize the context value:**

```jsx
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ user, setUser, theme, setTheme }), [user, theme]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

This helps, but **doesn't fully solve it**: if *either* `user` or `theme` changes, the memoized object still changes as a whole, so a component reading only `theme` still re-renders when `user` changes (since the object reference is still all-or-nothing per Provider).

**2. Split into multiple contexts by update frequency / concern:**

```jsx
// Two separate contexts - a component reading only ThemeContext never re-renders when `user` changes.
<UserContext.Provider value={userValue}>
  <ThemeContext.Provider value={themeValue}>
    {children}
  </ThemeContext.Provider>
</UserContext.Provider>
```

This is the most common real fix - split contexts along "things that change together."

**3. Don't use Context for frequently-changing, high-fan-out values at all** - e.g., mouse position, scroll offset, form field values on every keystroke shared broadly. Use a dedicated state library (Zustand) with selector-based subscriptions instead, which only re-renders components that actually read the changed slice (see Section 5).

**4. Use `useSyncExternalStore`-based selector libraries** (which is exactly what Zustand does) when you need "shared state with fine-grained subscriptions" - Context fundamentally cannot do partial/selective re-rendering on its own; it's all-or-nothing per Provider value.

### Interview question

**Q: Why is Context a poor fit for frequently-changing, widely-consumed state?**

> "Context re-renders every consumer whenever the Provider's value reference changes, with no built-in way to subscribe to just a slice of that value - it's not selector-based. So even memoizing the value only helps when *nothing* in it changed; if any field changes, every consumer re-renders regardless of which field it actually reads. For state that changes often and has many consumers, that causes real perf problems. Zustand or Redux with selectors solve this because each component subscribes to a derived slice and only re-renders when *that slice* changes, not the whole store."

---

## 4. Server state is not client state - the core insight behind React Query

### Why server state is fundamentally different

Client state (a modal being open, a form field's current value) is state **you own outright** - your app is the single source of truth, and it's synchronous and instantly "correct" the moment you set it.

Server state is **borrowed** - your app has a *copy* of something the server owns, and that copy can be:
- **Stale** the moment you receive it (another client, or a background job, might change it a second later).
- **Asynchronous to fetch**, with pending/error states that need consistent handling.
- **Shared** - the same data (e.g., "current user's profile") may be needed by many unrelated components, and re-fetching it independently in each is wasteful and can produce inconsistent views if requests race.
- In need of **background revalidation** - refetch on window refocus, on reconnect, on interval, or when you know it changed (e.g., after a mutation).

### What happens if you manage server state with plain `useState` + `useEffect` (the anti-pattern)

```jsx
// The "naive fetch" anti-pattern - reimplemented ad hoc in every component that needs data.
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => { if (!cancelled) { setUser(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err); setLoading(false); } });
    return () => { cancelled = true; };  // guards against race conditions on fast userId changes
  }, [userId]);

  // ...
}
```

Problems this accumulates at scale:
- **No caching** - navigating away and back refetches from scratch every time, even if the data hasn't changed and was just fetched seconds ago.
- **No deduplication** - two components needing the same `userId` both fire independent requests.
- **No shared cache invalidation** - after a mutation (e.g., editing the profile), every component with a stale copy must be manually told to refetch.
- **Re-implementing race-condition guards, loading/error state, retry logic, and refetch-on-focus by hand, in every component** - this is exactly the boilerplate React Query eliminates.

### What React Query actually provides

React Query treats server state as a **cache keyed by query key**, with a background synchronization engine on top.

| Concept | What it means |
|---|---|
| **Query key** | An array (e.g., `['user', userId]`) that uniquely identifies a piece of cached server data - changing any part of the key is treated as "a different query" |
| **`staleTime`** | How long fetched data is considered "fresh" - within this window, refetches are skipped and cached data is served immediately |
| **`gcTime`/`cacheTime`** | How long *unused* (no active observers) cached data stays in memory before being garbage collected |
| **Background refetching** | Automatic refetch on window refocus, network reconnect, or a configured interval - keeps data eventually consistent without manual polling code |
| **Deduplication** | Multiple components calling `useQuery` with the same key share one in-flight request and one cache entry |
| **`isLoading` vs `isFetching`** | `isLoading` = no data yet at all (first fetch); `isFetching` = a fetch is happening right now, even if stale data is already being shown (background refetch) |
| **Mutations (`useMutation`)** | Encapsulate a write operation (POST/PUT/DELETE) with `onSuccess`/`onError`/`onSettled` hooks, typically used to invalidate or update related query cache entries afterward |
| **Invalidation** | `queryClient.invalidateQueries(['user', userId])` marks matching cached entries as stale, triggering a refetch for any currently-mounted observers |
| **Optimistic updates** | Update the cache immediately (before the server confirms) for instant UI feedback, with a rollback path if the mutation fails |

### Example: replacing the naive fetch with React Query

```jsx
function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
    staleTime: 60_000,   // treat as fresh for 1 minute - no refetch on remount within that window
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <ProfileView user={user} />;
}
```

Every concern from the naive version - dedup, caching, race conditions, loading/error state - is handled by the library, and any other component in the app calling `useQuery(['user', userId])` shares the same cache entry automatically.

### Example: mutation with cache invalidation

```jsx
function EditProfileForm({ userId }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updates) => fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });  // triggers refetch of fresh data
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }}>
      {/* ... */}
      <button disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</button>
    </form>
  );
}
```

### Example: optimistic update

```jsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previousTodos = queryClient.getQueryData(['todos']);
    queryClient.setQueryData(['todos'], (old) =>
      old.map(t => t.id === newTodo.id ? newTodo : t)
    );
    return { previousTodos };   // context passed to onError for rollback
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previousTodos);   // rollback on failure
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });   // reconcile with server truth either way
  },
});
```

### Interview question

**Q: Why not just put API responses into Redux/Zustand state?**

> "You *can*, but you end up manually rebuilding everything React Query gives you for free: cache keys, staleness rules, deduplication of concurrent requests for the same resource, background refetch on focus/reconnect, race-condition-safe request cancellation, and invalidation after mutations. Redux and Zustand are excellent for state your app owns and controls synchronously - they don't have an opinion about network lifecycle. Mixing concerns by hand-rolling server-state caching in a client-state store usually means reinventing React Query poorly. My default is: server data goes in React Query; genuinely client-owned data goes in Redux/Zustand."

**Follow-up: Isn't this over-engineering - why not one library for everything?**

> "It would be over-engineering if server state and client state had the same requirements, but they don't - server state needs caching, staleness, and background sync; client state needs none of that but does need synchronous, predictable updates. Using React Query for server state and Zustand/Redux for client state isn't three overlapping tools, it's the right tool for two genuinely different problems, and it actually *reduces* code versus reimplementing fetch lifecycle management inside a general-purpose store."

---

## 5. Zustand - minimal client state without boilerplate

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

## 6. Redux Toolkit - modern Redux without the boilerplate

### Why Redux Toolkit exists

"Classic" Redux (`createStore`, hand-written action types, action creators, switch-based reducers, manual `combineReducers`, needing `redux-thunk`/immutability helpers set up separately) had a well-earned reputation for boilerplate. **Redux Toolkit (RTK)** is now the officially recommended way to write Redux - it doesn't change Redux's core ideas (single store, actions, reducers, unidirectional data flow), it eliminates the ceremony around them.

### Core building blocks

**`createSlice`** - bundles a reducer, its action creators, and action types into one declaration, and lets you write "mutating" logic that's actually safely immutable under the hood via Immer.

```jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk('user/fetchUser', async (userId) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, status: 'idle', error: null },
  reducers: {
    logout(state) {
      state.data = null;   // looks like a mutation, but Immer produces a new immutable state under the hood
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { logout } = userSlice.actions;
export default userSlice.reducer;
```

### Why the "mutating" syntax inside `createSlice` is safe

RTK wraps reducers with **Immer**. Immer lets you write code that *looks like* direct mutation (`state.data = action.payload`) against a special "draft" proxy object; Immer then produces a correctly immutable new state object by recording what you "changed" on the draft and applying those changes structurally, without you needing to manually spread (`{...state, data: action.payload}`) at every level. This is purely a **developer-ergonomics feature** - the actual state in the store remains immutable; Immer just removes the manual spreading boilerplate deep updates usually require.

### `configureStore`

```jsx
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: { user: userReducer },
  // Redux DevTools + thunk middleware are wired up automatically by default.
});
```

`configureStore` sets up sensible defaults out of the box: Redux DevTools integration, `redux-thunk` middleware for async action creators, and development-mode checks for accidental state mutation outside reducers and non-serializable values in the store (both configurable).

### Selectors and `useSelector`

```jsx
function UserBadge() {
  const userName = useSelector((state) => state.user.data?.name);
  // Re-renders only if the SELECTED VALUE changes (by reference/equality),
  // not on every store update - similar principle to Zustand's selector model.
  return <span>{userName}</span>;
}
```

Best practice: keep selectors narrow (select only what the component needs) and, for derived/computed values, use **`createSelector` from Reselect** (bundled conceptually with RTK's ecosystem) to memoize expensive derivations so they don't recompute on every unrelated store update.

```jsx
import { createSelector } from '@reduxjs/toolkit';

const selectVisibleTodos = createSelector(
  [(state) => state.todos.items, (state) => state.todos.filter],
  (items, filter) => items.filter(t => filter === 'all' || t.status === filter)
);
```

`createSelector` memoizes based on its input selectors' outputs - if `items` and `filter` haven't changed since last time, it returns the exact same array reference instead of recomputing/re-filtering, which also helps downstream `React.memo` children avoid unnecessary re-renders.

### RTK Query (worth knowing exists, even if your CV emphasizes plain React Query)

RTK also ships **RTK Query**, a data-fetching/caching layer built into Redux Toolkit with a similar philosophy to React Query (query hooks, cache, invalidation via "tags"). If asked "RTK Query vs React Query," a solid answer: 

> "They solve the same core problem - server-state caching and synchronization - with different integration points. RTK Query lives inside the Redux store (useful if you're already deeply invested in Redux and want server cache visible in Redux DevTools alongside client state), while React Query is standalone and framework-state-agnostic. My production stack uses React Query specifically so server-state logic isn't coupled to whichever client-state library the app happens to use, and it's a widely adopted, mature default outside Redux-first codebases."

### When to reach for Redux Toolkit vs Zustand vs plain Context (your decision framework)

| Question | Answer -> Tool |
|---|---|
| Is this server data? | React Query - always, regardless of "how much" it's shared |
| Does it change rarely and just needs to avoid prop drilling? | Context (with a memoized value, or split contexts if it has multiple independently-changing fields) |
| Is it client-only, shared, and changes moderately-to-often, but doesn't need heavy middleware/dev tooling/team-wide reducer conventions? | Zustand |
| Is it complex, cross-cutting, app-wide domain state that benefits from centralized reducers, strict action-based auditing, a large team's established Redux conventions, or deep DevTools time-travel debugging? | Redux Toolkit |
| Is it truly local to one component (and its direct children via props)? | `useState`/`useReducer` |

### Interview question

**Q: Your CV lists Redux, Zustand, AND React Query. Isn't that redundant?**

> "No - they cover different problems. React Query owns server state end-to-end: caching, staleness, background refetch, mutations, invalidation. Redux Toolkit owns genuinely global, cross-feature client state - things like auth/session or app-wide settings - where centralized reducers, middleware, and DevTools time-travel are valuable, especially on a team with established Redux conventions. Zustand fills the gap for smaller, feature-scoped shared client state where Redux's setup would be overkill - no provider, minimal API, selector-based subscriptions to avoid unnecessary re-renders. In practice, picking the right one per piece of state means less code overall, not more, because each tool is solving the problem it's actually good at instead of one tool doing everything adequately."

---

## 7. Prop drilling - when it's fine, and when it's a smell

Prop drilling (passing a prop through several intermediate components that don't use it themselves, just to reach a deep child) is often over-diagnosed as "bad" - it's actually **fine and often preferable** for 1-2 levels, because it keeps data flow explicit and traceable (you can find every consumer of a value with a simple search of prop usage, unlike Context/global state which requires tracing subscriptions).

**It becomes a real problem when:**
- Depth exceeds ~3 levels and most intermediate components have no reason to know about the prop.
- The same prop needs to be threaded through many different unrelated branches of the tree.
- Intermediate components' prop signatures balloon just to forward values they don't use, hurting readability and making refactors error-prone.

**Fixes, in order of preference:**
1. **Component composition** - pass the deep child as `children` or a render prop to the intermediate component, so the intermediate component doesn't need to know about the prop at all (it just renders whatever `children` it's given).
2. **Colocate state closer to where it's used** - sometimes drilling is a sign the state is lifted higher than it needs to be.
3. **Context** - for genuinely cross-cutting, infrequently-changing values.
4. **Zustand/Redux** - for state needed broadly and updated more frequently, per the framework above.

### Interview question

**Q: Is prop drilling always bad?**

> "No - for 1-2 levels it's often the simplest, most explicit option and easier to trace than a global store. It becomes a problem when it's deep, spans many unrelated branches, or forces intermediate components to carry props they don't use. My first fix is usually composition - passing components as `children`/props so intermediates don't need to know about the data - before reaching for Context or a store."

---

## Interview question bank (state & data fetching)

1. **How do you classify a new piece of state before deciding where it lives?**
2. **Why is server state fundamentally different from client state?**
3. **Walk me through what goes wrong if you manage server data with `useState` + `useEffect` at scale.**
4. **Explain `staleTime` vs `gcTime` (cache time) in React Query.**
5. **How does React Query prevent duplicate network requests for the same data?**
6. **What is an optimistic update, and how do you roll it back on failure?**
7. **Why does Context re-render every consumer on any value change, and how do you mitigate it?**
8. **How does Zustand achieve selective re-rendering without a Provider?**
9. **What does Immer let you do inside `createSlice`, and why is it still safe/immutable underneath?**
10. **When would you choose Redux Toolkit over Zustand for a new feature?**
11. **What is `createSelector`/Reselect for, and what problem does memoized selection solve?**
12. **RTK Query vs React Query - what's the actual difference in philosophy?**
13. **Why might putting fetched API data directly into Redux/Zustand be an anti-pattern?**
14. **When is prop drilling actually fine, and when does it become a real problem?**
15. **How would you architect state for a dashboard with: user session, a data table with filters/sort/pagination, and a live list of products fetched from an API?** (Model answer: session -> Redux (or Context if simple/rare), filters/sort/pagination -> Zustand or local state depending on scope, products -> React Query keyed by the filter/sort/pagination params so changing them naturally produces a new cached query.)

---

## Hands-on drills (do these)

- [ ] Build the "naive fetch" `useEffect` + `useState` data-fetching anti-pattern, deliberately trigger a race condition (fast-changing `userId` prop with variable-latency mock fetches), then replace it with `useQuery` and show the race condition is gone for free.
- [ ] Build a Context-based theme + user provider with a single combined value object; add a render counter to a component that only reads `theme`; change `user` and observe the unnecessary re-render; fix it by splitting into two contexts.
- [ ] Build the same shared state (e.g., sidebar open + filters) with Zustand using per-field selectors; add render counters to prove only the relevant component re-renders per field change.
- [ ] Write a `createSlice` with `createAsyncThunk` for a fetch-user flow, including pending/fulfilled/rejected cases; log the resulting actions in Redux DevTools.
- [ ] Implement an optimistic `useMutation` for toggling a todo's completed state, including rollback on a simulated failure.
- [ ] Write `createSelector` for a filtered+sorted list and prove (via a render counter) that recomputation only happens when the actual inputs change, not on unrelated store updates.

---

## Senior red flags / green flags

### Green flags interviewers love
- Classifying state (local/client-shared/global/server) before naming a tool - shows judgment, not tool-first thinking.
- Precisely explaining *why* React Query exists instead of "it's for fetching data" (staleness, cache, dedup, background sync).
- Knowing Context's all-or-nothing re-render behavior cold, with a concrete mitigation.
- Giving a crisp, non-defensive answer to "why 3 state libraries" that frames it as separation of concerns, not accumulated tech debt.

### Red flags
- Storing fetched API responses directly in Redux/Zustand as the primary pattern, with manual loading/error booleans everywhere.
- "Context is basically Redux" (no - no selectors, no middleware, all-or-nothing re-renders).
- Not knowing the difference between `isLoading` and `isFetching` in React Query.
- Defaulting to Redux for every shared value "because that's what we always use," without being able to justify it against Zustand/Context for the specific case.

---

## Mastery checklist

- [ ] I can classify any given piece of state into local/client-shared/global/server in under 10 seconds.
- [ ] I can explain, with a code example, exactly why Context re-renders every consumer and how splitting contexts fixes it.
- [ ] I can explain React Query's cache/staleness/invalidation model well enough to design a query-key scheme for a new feature.
- [ ] I can write a `createSlice` with async thunks and explain why Immer's mutation-looking syntax is still safe.
- [ ] I can explain Zustand's selector-based subscription model and why it avoids Context's re-render problem.
- [ ] I can defend my CV's "Redux + Zustand + React Query" stack as intentional separation of concerns, with a concrete example architecture (like the dashboard question above) ready to sketch on a whiteboard.
