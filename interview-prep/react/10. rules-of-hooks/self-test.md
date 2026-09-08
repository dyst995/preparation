# The Rules of Hooks — Self-test

## Core recall

1. What are the two primary Rules of Hooks?
2. Why must hooks stay at the top level?
3. Where are you allowed to call hooks?
4. Why should custom hooks start with `use`?
5. How do you run effect logic only when `isEnabled` is true?
6. How do you give each list item its own `useState` legally?
7. Can you call `setState` inside an event handler? Is that a hook call?
8. Is conditionally rendering `<AdminPanel />` a Rules-of-Hooks violation?

## Explain why

1. Why is `if (isAdmin) useEffect(…)` illegal but `useEffect(() => { if (!isAdmin) return; … })` legal?
2. Why doesn’t putting `useState` in `items.map` in the parent work?
3. Why can a child `ItemRow` call `useState` once per row?
4. Why must hooks run before `if (!user) return null`?
5. Why is calling `useState` inside `onClick` illegal?
6. Why does the linter care about the `use` prefix?

## Compare and contrast

1. Conditional hook call vs conditional component mount  
2. Branch inside effect vs skip calling the effect hook  
3. Parent array state vs per-row child state  
4. Hook call vs using a hook’s return value in a handler  
5. Custom hook vs normal helper function  
6. Rules of Hooks vs exhaustive-deps (related but different)

## Predict the behavior / validity

1. `if (!isAdmin) return null;` then `useAdminAudit()` below — valid?  
2. `isAdmin && <AdminPanel />` where `AdminPanel` uses hooks — valid?  
3. `useEffect` always called; deps `[isAdmin]`; body returns early if `!isAdmin` — valid?  
4. `for (const x of xs) useMemo(() => x, [x])` — valid?

## Debugging

1. Lint: “React Hook useEffect is called conditionally.” Fix approach?  
2. Runtime: fewer hooks than expected after adding `if (featureFlag) useFoo()`. Diagnosis?  
3. Dev wants admin-only subscription; wrapped `useEffect` in `if (isAdmin)`. Rewrite.  
4. List rows used `useState` in parent `map`; weird state bugs when filtering. Better structure?

## Application

1. Rewrite illegal conditional `useEffect` for `isEnabled`.  
2. Implement `useAdminAudit(isAdmin)` that no-ops for non-admins but is always called.  
3. Sketch `List` + `ItemRow` so each row has local `editing` state.  
4. Fix a component that returns early before `useState`.  
5. Answer in one sentence: “hook only for admins” without `if` around the call.

## Interview questions

1. You need a hook only for admin users. How do you structure this?  
   **Follow-ups:** Child component approach? Why not `if (isAdmin) useX()`?

2. What are the Rules of Hooks and why do they exist?

3. How do you handle per-item hooks in a list?

4. What’s the difference between calling a hook and using `setState` in a click handler?

5. Why name custom hooks with `use`?

## Connections

1. How does this unit apply the mechanics unit’s linked-list model?
2. How do keys on `ItemRow` interact with each row’s hook state?
3. How does eslint-plugin-react-hooks relate to both rules?
4. How is “branch inside effect” consistent with StrictMode cleanup expectations?
5. When would you prefer splitting an admin child over a no-op hook in the parent?
