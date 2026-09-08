# Reconciliation: The Diffing Algorithm — Self-test

## Core recall

1. Why doesn’t React use a general O(n³) tree diff?
2. What are React’s two main reconciliation heuristics?
3. What happens when the element type at a position changes?
4. What happens when type is the same but `key` changes?
5. Without keys, how does React match list children?
6. What goes wrong with `key={index}` when you prepend an item?
7. When is index-as-key acceptable?
8. What does React assume about keys among siblings?

## Explain why

1. Why tear down the whole subtree on type change instead of diffing children anyway?
2. Why do keys exist if React already has array order?
3. Why does row-local `useState` “move” to the wrong todo with index keys?
4. Why can switching `Editor` / `Viewer` reset state even with no list?
5. Why is `key={Math.random()}` harmful?
6. Why aren’t keys passed as normal props into your component?

## Compare and contrast

1. Same-type update vs different-type remount  
2. Stable `id` key vs index key  
3. Reordering with good keys vs without keys  
4. State lift vs keeping one component type to preserve state across UI modes  
5. Duplicate keys vs missing keys  
6. Reconciliation heuristics vs optimal minimal diff  

## Predict the behavior

1.
```jsx
{flag ? <input key="a" /> : <input key="b" />}
```
Does focus/state inside the input survive toggling `flag`? Why?

2.
```jsx
{flag ? <Editor /> : <Viewer />}
```
Does `Editor`’s `useState` survive `flag` true→false→true?

3. List keyed by index; item at index 0 has local `expanded=true`; prepend a new item. What is expanded after reconcile?

4. List keyed by `item.id`; reorder items. Do per-id fibers move with their items?

5. Two children both `key="1"`. What should you expect?

## Debugging

1. Todo text inputs show the wrong todo’s text after sorting. Suspect?

2. Form state clears every time user toggles “edit mode” between two different components. Suspect?

3. DevTools warning about same key. Impact?

4. Accordion animation remounts every parent render; keys are new UUIDs each time. Fix?

5. Filtered list uses index keys; deleting an item in the middle corrupts later rows’ local state. Explain.

## Application

1. Rewrite a `map` of users to use a stable key.

2. Refactor `isEditing ? <Editor /> : <Viewer />` so draft text state can persist (sketch approach).

3. Decide index vs id key for: (a) static emoji legend, (b) searchable sortable table, (c) infinite scroll feed with prepend.

4. Explain in two sentences what you’ll check when “state resets mysteriously.”

## Interview questions

1. Why does React need `key`, and what breaks without a stable key?  
   **Follow-ups:** Duplicate keys? When is index OK?

2. What are the reconciliation heuristics that keep diffing O(n)?

3. What happens when component type changes at the same position?

4. Walk through the index-as-key prepend bug.

5. How do keys relate to Fiber identity?

## Connections

1. How does reconciliation decide whether a fiber is reused (Fiber unit)?
2. How do unmounts from type/key changes interact with effect cleanups (render/commit)?
3. How does this relate to “re-render ≠ DOM update”?
4. Why does list performance advice start with keys before memo?
5. How does conditional rendering of different types connect to state ownership?
