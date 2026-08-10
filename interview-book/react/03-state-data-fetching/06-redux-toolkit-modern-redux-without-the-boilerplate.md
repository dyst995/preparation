# 06. Redux Toolkit - modern Redux without the boilerplate

> Source: `interview-prep/react/03-state-data-fetching.md`

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
