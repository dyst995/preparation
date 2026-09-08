# The Four Kinds of State — Self-test

## Core recall

1. Name the four kinds of state.
2. Where does local UI state usually live?
3. Give two examples of shared client state and a typical tool split (rare vs frequent).
4. What makes state “server state”?
5. Typical home for server state?
6. Why does classification matter more than picking a favorite library?
7. What’s the most common misclassification?
8. Recite the decision flow in four steps.

## Explain why

1. Why isn’t “many components need this list” enough reason to put API data in Redux?
2. Why can theme live in Context while a product catalog should not?
3. Why does local state dying on unmount matter for “current filters”?
4. Why might auth be split between client flag and server-cached profile?
5. Why do stale/cache/revalidate problems define server state?
6. Why is “everything in one store” attractive but costly?

## Compare and contrast

1. Local UI vs shared client  
2. Shared client vs global app state  
3. Shared client vs server state  
4. Context vs Zustand for shared client  
5. Redux Toolkit vs React Query (what each owns)  
6. Prop drilling local state vs lifting to shared client  

## Classify these (kind + tool lean)

1. Dropdown `isOpen`  
2. Dark mode preference  
3. `GET /orders` list on the orders page  
4. Toast queue for the whole app  
5. Multi-step checkout wizard step index  
6. Search results from `/search?q=`  
7. Whether the left nav is collapsed  
8. Current user permissions from `/me`  

## Debugging / design smell

1. Team stores `users[]` from the API in Redux and hand-rolls loading/error per screen. Misclassification?  
2. Mouse coordinates in React Context updated every `mousemove`. What’s wrong with the kind/tool pairing?  
3. Product detail fetched in three places with three `useEffect`s into three `useState`s. Better kind?  
4. Sidebar open flag in Redux Toolkit with a full slice. Overkill? What kind is it?

## Application

1. For a new “favorite color” toggle used only in `SettingsPage`, pick kind + tool.  
2. For favorites list from the API shown in header badge + favorites page, pick kind + tool.  
3. Write the interview answer to “where should this state live?” in your own words (4–6 sentences).  
4. Draw a quick map: local / shared / global / server → one example each from an app you know.

## Interview questions

1. How do you decide where a new piece of state should live?  
   **Follow-ups:** Server vs client? Context vs Zustand vs Redux?

2. What is server state and why is it different?

3. Give examples of misclassifying state and the bugs that follow.

4. Is auth local, shared, global, or server? Defend a split.

5. Why might a modern stack use React Query *and* Zustand/Redux together?

## Connections

1. How does this set up the Context / Redux / Zustand / RQ sections that follow?
2. How does local `useState` from the hooks chapter fit kind #1?
3. How does “custom hooks aren’t shared state” reinforce kind boundaries?
4. How does URL state sometimes replace shared client filters?
5. How does treating server data as client state create race/stale UI bugs you’ll see in RQ sections?
