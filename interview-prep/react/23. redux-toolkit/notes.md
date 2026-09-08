# Redux Toolkit — Modern Redux Without the Boilerplate

## What you need to know

**Redux Toolkit (RTK)** is the **official** way to write Redux. Core ideas unchanged:

- Single store  
- Actions describe “what happened”  
- Reducers (pure) compute next state  
- Unidirectional data flow  

RTK removes classic ceremony (`createStore`, hand-written action types, sprawling switch reducers, manual thunk setup).

Use RTK for **complex / global client** state. Use **React Query** for server cache. Use **Zustand** for lighter shared client state. Use **Context** for rare cross-cutting values.

Prerequisites: [four kinds of state](../18.%20four-kinds-of-state/notes.md), [Zustand](../22.%20zustand/notes.md), [server state / RQ](../21.%20server-state-react-query/notes.md).

---

## Why RTK exists (preserved)

Classic Redux earned a boilerplate reputation. RTK keeps the architecture, drops the ceremony: `createSlice`, `configureStore`, Immer, DevTools + thunk by default, `createAsyncThunk`, good TypeScript DX.

---

## Unidirectional flow (mental model)

```text
UI → dispatch(action) → reducer(s) → new store state → useSelector → UI
```

- Components **read** via `useSelector`  
- Components **write** via `dispatch(action)`  
- No silent mutation of store from random modules (dev checks help catch accidents)

---

## `createSlice` (preserved)

Bundles **name**, **initial state**, **reducers**, auto **action creators** / types. “Mutating” syntax is safe via **Immer**.

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
      state.data = null; // Immer draft — produces immutable update
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
      })
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

- **`reducers`:** sync actions owned by this slice  
- **`extraReducers`:** respond to actions defined elsewhere (thunks, other slices)  
- **`createAsyncThunk`:** standard pending/fulfilled/rejected action set for async work  

**Note:** Fetching *users* often belongs in **React Query** today; the thunk example still teaches RTK async patterns (auth bootstrap, non-HTTP work, legacy code). Prefer RQ for typical REST/GraphQL server state.

---

## Why “mutating” syntax is safe (preserved)

Immer wraps the reducer with a **draft proxy**. You write `state.data = payload`; Immer records patches and emits a **new immutable** state tree. Store state stays immutable; you skip manual deep spreads.

**Don’t:** mutate *real* state outside the draft (e.g. mutate a value you plucked from `getState()` and expect Redux to notice). Dev serializable/immutability checks catch many mistakes.

---

## `configureStore` (preserved)

```jsx
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: { user: userReducer },
});
```

Defaults typically include:

- Redux **DevTools**  
- **thunk** middleware  
- Dev checks for accidental mutations and non-serializable values  

Wrap the app with `<Provider store={store}>` (unlike Zustand).

---

## Selectors and `useSelector` (preserved)

```jsx
function UserBadge() {
  const userName = useSelector((state) => state.user.data?.name);
  return <span>{userName}</span>;
}
```

Re-renders when the **selected value** changes (default `===` / reference equality) — same *idea* as Zustand selectors.

**`createSelector` (Reselect, via RTK):**

```jsx
import { createSelector } from '@reduxjs/toolkit';

const selectVisibleTodos = createSelector(
  [(state) => state.todos.items, (state) => state.todos.filter],
  (items, filter) => items.filter((t) => filter === 'all' || t.status === filter),
);
```

Memoizes derived arrays/objects so inputs unchanged ⇒ **same output reference** ⇒ fewer child re-renders / less work.

Keep selectors **narrow**. Avoid `useSelector(state => state)` unless you want every update.

---

## RTK Query vs React Query (preserved)

Same problem family: server-state cache, hooks, invalidation (RQ: keys; RTK Query: **tags**).

| | RTK Query | React Query |
| --- | --- | --- |
| Lives in | Redux store | Standalone |
| Best when | Redux-first app; want cache in DevTools next to client state | Keep server cache decoupled from client store |
| Stack fit | Heavy Redux investment | Default with Zustand/Context client state |

Spoken default from curriculum: production often uses **React Query** so server logic isn’t coupled to the client-state library.

---

## Decision framework (preserved)

| Question | Tool |
| --- | --- |
| Server data? | **React Query** |
| Rare shared, avoid drilling? | **Context** (memoize / split) |
| Client shared, moderate complexity, minimal ceremony? | **Zustand** |
| Complex global domain, reducers, middleware, team Redux, deep DevTools? | **Redux Toolkit** |
| Truly local? | **`useState` / `useReducer`** |

---

## “Redux + Zustand + React Query — redundant?” (preserved)

> No — different problems. **RQ** = server cache lifecycle. **RTK** = global cross-feature client state where reducers/middleware/DevTools matter. **Zustand** = smaller feature-scoped shared client state without Redux setup. Right tool per piece of state ⇒ **less** code than one tool doing everything poorly.

---

## Common mistakes and misconceptions

1. Putting all API data in RTK instead of RQ / RTK Query.  
2. Believing Immer means the store is mutable at runtime for subscribers.  
3. Fat `useSelector(s => s.user)` when you only need one field (or returning new objects without memo).  
4. Classic Redux boilerplate in new apps instead of RTK.  
5. Skipping `Provider`.  
6. Overusing Redux for a single boolean.

---

## Connections to other concepts

```
unidirectional Redux flow
  ← same spirit as useReducer, scaled to app

createSlice + Immer
  ← ergonomic immutable updates

useSelector
  ← fine-grained subscriptions (like Zustand)

server state
  ← RQ (or RTK Query), not hand-rolled thunks for every GET

four kinds / decision table
  ← RTK = heavy global client
```

---

## Interview perspective

Be ready to:

1. What RTK fixed vs classic Redux.  
2. `createSlice` / Immer / `configureStore`.  
3. Selectors + `createSelector`.  
4. RTK Query vs React Query one-liner.  
5. Defend multi-tool CV (RQ + Zustand + RTK).  
6. When *not* to use Redux.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
