# Local Component State — `useState` / `useReducer` — Self-test

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
