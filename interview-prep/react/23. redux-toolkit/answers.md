# Redux Toolkit — Answers

## Core recall

1. Single store, actions, pure reducers, unidirectional flow.  
2. Reducer logic, action creators, action types (slice name + reducers).  
3. Immer drafts — looks like mutation, emits immutable next state.  
4. DevTools, thunk middleware, mutation/serializable checks (dev).  
5. When the **selected value** changes by equality comparison.  
6. Memoize derived data so unchanged inputs reuse the same output reference.  
7. Same server-cache problem; RTK Query inside Redux vs RQ standalone.  
8. Complex cross-cutting client domain, middleware/DevTools/team Redux norms.

## Explain why

1. Manual types, creators, switches, store setup, immutability verbosity.  
2. Deep updates without painful spreads; fewer immutable-update bugs.  
3. RQ already owns cache/staleness/dedupe/invalidation; thunks reinvent it.  
4. Fewer false re-renders; clearer data dependencies.  
5. Each tool owns a different state kind/problem — less overlap than it sounds.  
6. Store must be injected into the React tree for hooks (`Provider`).

## Compare and contrast

1. **Classic:** ceremony. **RTK:** same model, batteries included.  
2. **reducers:** slice’s own actions. **extraReducers:** outside actions/thunks.  
3. **RTK:** heavier structure. **Zustand:** minimal, no Provider.  
4. **RTKQ:** Redux-integrated cache. **RQ:** decoupled default.  
5. **useSelector:** slice equality. **Context:** whole value.  
6. **Manual:** verbose spreads. **Immer:** draft ergonomics, immutable result.

## Predict / choose

1. **Context** (or tiny Zustand).  
2. **Redux Toolkit**.  
3. **React Query**.  
4. **Zustand** (or local/lifted state).

## Debugging

1. Illegal external mutation — won’t notify; use `dispatch` + reducer.  
2. Inline derived array new each time — use `createSelector` or select raw data and memoize.  
3. Put non-serializable stuff outside state or configure checks; prefer plain data.  
4. Move GETs to **React Query** (or RTK Query), share cache by key/tags.

## Application

1.
```jsx
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) { state.value += 1; },
    reset(state) { state.value = 0; },
  },
});
```

2. `configureStore({ reducer: { counter: counterSlice.reducer } })`.  
3. `useSelector((s) => s.counter.value)`.  
4. As in notes — inputs items+filter → filtered list.  
5. Paraphrase preserved CV answer: RQ server; RTK global client; Zustand feature client.

## Interview questions

1. **Spoken:** Not redundant — RQ server lifecycle; RTK global client/domain; Zustand small shared client. Right tool per state ⇒ less code.  
2. **Spoken:** Official Redux with slices, Immer, configureStore defaults — same architecture, less boilerplate.  
3. **Spoken:** Draft proxy records changes → immutable next state; store stays immutable.  
4. **Spoken:** `useSelector` narrow reads; `createSelector` memoizes derived values.  
5. **Spoken:** Same server-state job; RTKQ in Redux vs RQ standalone — choose by coupling preference.  
6. **Spoken:** Local UI or simple shared state — useState/Context/Zustand instead.

## Connections

1. RTK is the usual implementation of heavy **global app / complex client** state.  
2. `useReducer` = local unidirectional actions; Redux scales that to one store.  
3. Both aim for selective re-renders via selected/derived values.  
4. The table is the interview decision framework across the chapter.  
5. Immutable next state enables reliable `===` selector comparisons / React memo friendliness.
