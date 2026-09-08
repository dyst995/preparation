# Virtual DOM — Self-test

## Core recall

1. What is the virtual DOM, in one or two sentences, without saying “it’s faster”?
2. What three fields of a React element do you actually need in an interview (`type`, …)?
3. Is a React element a DOM node? Where does the real host node live in the bigger model?
4. What does JSX compile to? Is JSX itself the virtual DOM?
5. What is the difference between `type: 'button'` and `type: SaveButton` on an element?
6. On each render, does React usually reuse last render’s element objects, or allocate new ones?
7. What does React compare the new element tree against in React 16+ (precise answer)?
8. Name one reason touching the real DOM at scale is expensive.

## Explain why

1. Why does React keep a description of the UI in JS objects instead of only mutating the document?
2. Why is “virtual DOM is always faster than the real DOM” not a safe interview claim?
3. Why can creating a new element tree every render still be acceptable?
4. Why is hand-mutating the DOM (jQuery-style) a correctness problem as the app grows?
5. Why is treating JSX as “the virtual DOM” a category error?
6. Why doesn’t React need to read the live DOM to decide what to update?

## Compare and contrast

1. React element (VDOM) vs DOM node
2. JSX vs `createElement` / `jsx()` vs the element tree
3. Host element (`'div'`) vs composite element (`Profile`)
4. React element vs Fiber
5. “Two VDOM trees” teaching story vs element tree vs current fiber tree
6. Declarative `UI = f(state)` vs imperative DOM patches

## Predict the output

1. What kind of object does this produce — DOM node or React element?

```jsx
const el = <button className="btn">Save</button>;
```

2. Parent renders `<SaveButton onSave={fn} />`. What is `type` on the element the parent **returns**, before React runs `SaveButton`?

3. `SaveButton` returns `<button>Save</button>`. After React runs the function, what is `type` on that child element?

4. Same text in a `<p>` for two parent re-renders, no other prop changes. Must commit rewrite that `p`’s DOM text? Why or why not? (Stay at VDOM/description level.)

## Debugging

1. Candidate: “We use virtual DOM so React is always faster than vanilla JS.” How do you correct them without dumping the whole Fiber chapter?

2. Engineer mutates the object returned by `createElement` and is surprised the UI is wrong. What’s the mistaken assumption?

3. Someone says “the virtual DOM is Fiber.” What’s mixed together, and how do you split it?

4. A teammate updates the UI by `document.getElementById` in a component body “because VDOM is just a copy anyway.” What’s wrong with that model?

## Application

1. Sketch `createElement` (or `jsx`) for `<button className="btn" onClick={fn}>Save</button>`.

2. Write the three-layer pipeline: syntax → description → persistent tree → host. Label which layer is “virtual DOM” in interview talk.

3. Give a two-sentence explanation you’d use with a junior: why we don’t `querySelector` to sync UI after `setState`.

4. Write one sentence that names the real value of VDOM **and** one sentence that names what it is **not**.

## Interview questions

1. What is the virtual DOM and why does it exist?  
   **Follow-ups:** Is it always faster? Is JSX the VDOM?

2. Walk through what happens when a function component returns JSX, up to (but not including) a deep Fiber lecture.

3. Why not just mutate the DOM ourselves?

4. What’s the difference between a React element and a Fiber?

5. If they say “React diffs two virtual DOM trees” — agree, then tighten the wording.

## Connections

1. How does the VDOM description layer make render-phase purity make sense?
2. How does “new elements every render” still allow “no DOM update”?
3. How does reconciliation use `type` and `key` that live on elements?
4. Why does Fiber exist as something *more* than the element tree?
5. How would this story change on React Native (what stays, what is the host)?
