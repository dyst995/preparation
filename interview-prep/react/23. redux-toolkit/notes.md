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

# Self-test

## Core recall

1. What core Redux ideas did RTK keep?
2. What does `createSlice` bundle?
3. Why is “mutating” in a slice reducer safe?
4. What does `configureStore` set up by default (name three)?
5. When does a `useSelector` component re-render?
6. What problem does `createSelector` solve?
7. RTK Query vs React Query in one contrast?
8. When prefer RTK over Zustand?

## Explain why

1. Why did classic Redux get a boilerplate reputation?
2. Why use Immer instead of manual spreads everywhere?
3. Why put async HTTP list fetching in RQ rather than `createAsyncThunk` by default today?
4. Why keep selectors narrow?
5. Why isn’t listing three state libraries on a CV automatically redundant?
6. Why does RTK still use a Provider?

## Compare and contrast

1. Classic Redux vs Redux Toolkit  
2. `createSlice` reducers vs `extraReducers`  
3. Redux Toolkit vs Zustand  
4. RTK Query vs React Query  
5. `useSelector` vs Context consumer  
6. Hand-written immutable updates vs Immer drafts  

## Predict / choose

1. Theme string rarely changing — RTK, Zustand, or Context?  
2. Multi-slice checkout + payments + entitlements with audit trail — lean?  
3. `GET /products` for a catalog page — lean?  
4. Table filters for one feature page — lean?

## Debugging

1. UI doesn’t update after `const u = useSelector(s => s.user); u.name = 'x'`. Why?  
2. Component re-renders on every store tick; selector returns `state.todos.items.map(...)` inline. Fix?  
3. Dev warning about non-serializable value in state (a Class instance). Issue?  
4. Thunk fetch duplicated in five screens with no shared cache. Better approach?

## Application

1. Sketch a `counterSlice` with `increment` / `reset` using `createSlice`.  
2. Wire it into `configureStore`.  
3. Write a narrow `useSelector` for `count`.  
4. Sketch a `createSelector` for filtered items.  
5. Answer “Redux + Zustand + RQ?” in 4–5 spoken sentences.

## Interview questions

1. Your CV lists Redux, Zustand, and React Query — isn’t that redundant?  
2. What is Redux Toolkit and why use it over classic Redux?  
3. Explain Immer in `createSlice`.  
4. How do selectors work in RTK apps?  
5. RTK Query vs React Query?  
6. When is Redux overkill?

## Connections

1. How does RTK map to “global app state” in four-kinds?
2. How is `useReducer` a mini version of Redux ideas?
3. How do Zustand selectors and `useSelector` share a goal?
4. How does the decision table unify Context / Zustand / RTK / RQ?
5. How does Immer relate to React’s immutability expectations for bail-outs?
