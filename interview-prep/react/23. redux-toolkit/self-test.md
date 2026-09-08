# Redux Toolkit — Modern Redux Without the Boilerplate — Self-test

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
