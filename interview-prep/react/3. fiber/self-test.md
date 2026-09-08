# Fiber: The Unit of Work — Self-test

## Core recall

1. What two meanings does “Fiber” have in React?
2. How does a fiber differ from a React element?
3. What problem did the stack reconciler have?
4. How does Fiber make rendering interruptible at a high level?
5. What are the **current** and **work-in-progress** trees?
6. What is `alternate` for?
7. Where do hooks’ state conceptually live?
8. Is Fiber the same as concurrent mode / concurrent features?

## Explain why

1. Why was a recursive stack walk hard to pause?
2. Why link fibers with `child` / `sibling` / `return`?
3. Why keep two trees instead of mutating the on-screen tree during render?
4. Why can concurrent features exist only after something like Fiber?
5. Why does render purity matter more in a Fiber world?
6. Why doesn’t pausing mid-render leave a half-updated DOM?

## Compare and contrast

1. Stack reconciler vs Fiber reconciler  
2. React element vs fiber node  
3. Current fiber tree vs WIP fiber tree  
4. Fiber architecture vs `useTransition` / concurrent rendering  
5. Pausing render work vs committing DOM updates  
6. “Virtual DOM” casual meaning vs Fiber precisely  

## Predict / reason about behavior

1. Large low-priority render in progress; user types in an input marked urgent. What is Fiber *for* in that scenario?

2. WIP render is abandoned. Does the **current** tree still match what’s on screen? Why?

3. After a successful commit, which tree is “on screen”?

4. Someone says “React 16 removed the virtual DOM and only uses Fiber.” What’s the precise correction?

## Debugging / misconceptions

1. Interview answer stops at “Fiber makes React faster.” What’s missing?

2. Dev thinks `startTransition` *is* Fiber. How do you correct them?

3. Confusion: hooks state “resets” because component type/key changed — relate to fiber identity (high level).

4. Belief that yielding means the DOM shows partial Fiber progress. Fix the mental model.

## Application

1. In 4–6 bullet points, explain Fiber to a mid-level engineer who knows VDOM but not Fiber.

2. Draw (in text) current ↔ alternate ↔ WIP and the commit swap.

3. List three fiber fields you’d mention in an interview and what each is for.

4. Write the one-sentence distinction: Fiber vs concurrent features.

## Interview questions

1. What problem does Fiber solve that the old stack reconciler didn’t?  
   **Follow-ups:** Is Fiber concurrent mode? What is double buffering?

2. What is a fiber as a data structure?

3. Explain current vs work-in-progress.

4. How does Fiber relate to `useTransition`?

5. Where do hooks fit in the Fiber model?

## Connections

1. How does Fiber enable the interruptible **render** phase from the previous unit?
2. How do elements from the VDOM unit feed into fibers?
3. How does commit still stay “all at once” relative to Fiber’s incremental render?
4. How does this set up reconciliation keys / identity (next topics)?
5. How does main-thread yielding here relate to the browser event loop (JS async unit)?
