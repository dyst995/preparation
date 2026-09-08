# Virtual DOM

## What you need to know

The **virtual DOM (VDOM)** is React’s in-memory description of what the UI *should* look like: a tree of plain JavaScript objects called **React elements**. On each render, your components return a new element tree. React **diffs** that description against what it already knows about the UI and computes the **smallest set of real host updates** (DOM on the web) to apply.

Curriculum this unit completes:

- What a VDOM node / React element actually is
- JSX vs `createElement` / `jsx()` vs the element tree
- Why a description layer exists (declarative UI, not “always faster”)
- Why hand-mutating the DOM does not scale
- How this sits next to Fiber, reconciliation, and commit

This unit is about **the description** (elements). [Fiber](../3.%20fiber/notes.md) is the **persistent work tree**. [Reconciliation](../4.%20reconciliation/notes.md) is **how** old vs new is compared. [Render vs commit](../2.%20render-vs-commit/notes.md) is **when** description work vs host writes happen.

---

## What a React element actually is

A VDOM node is a **plain JS object** — not a DOM node. Roughly:

```javascript
{
  type: 'button',
  props: { className: 'btn', onClick: fn, children: 'Save' },
  key: null,
}
```

Internally it also has a `$$typeof` marker (`Symbol.for('react.element')`) so React can tell real elements from random objects, plus `ref`. You do not recite the full shape in interviews; you do need: **type + props (+ key)**, cheap to create, **not** the real `<button>` in the document.

| Piece | What it is |
| --- | --- |
| `type` | Host tag string (`'div'`) **or** a component function/class |
| `props` | Inputs, including `children` |
| `key` | Identity hint among **siblings** (used later in reconciliation) |
| Host node | The real `HTMLButtonElement` (or RN view) — **not** this object |

**Host components** (`type: 'button'`) describe platform UI. **Composite components** (`type: Profile`) mean “run this function/class; its return value is more elements.” The element tree is therefore mixed: components until you hit host leaves.

Elements are **snapshots for this render**. The next render typically allocates **new** objects even if the UI looks the same. Identity of those objects is not how React matches “the same button” across updates — that is Fiber + keys.

---

## JSX is not the virtual DOM

**JSX is syntax.** The compiler turns it into function calls that **return** elements.

Classic transform:

```jsx
<button className="btn" onClick={fn}>Save</button>
```

```javascript
React.createElement('button', { className: 'btn', onClick: fn }, 'Save');
```

React 17+ **automatic runtime** (`jsx` / `jsxs` from `react/jsx-runtime`) does the same job without putting `React` in scope. **JSX is not the VDOM; it produces the VDOM (the element tree).**

```jsx
function SaveButton({ onSave }) {
  return (
    <button className="btn" onClick={onSave}>
      Save
    </button>
  );
}
```

Calling `SaveButton` returns an element `{ type: 'button', props: { ... } }`. Calling a **parent** that renders `<SaveButton onSave={fn} />` first produces `{ type: SaveButton, props: { onSave: fn } }`. React then **invokes** `SaveButton` and replaces that composite node with whatever it returned. That walk is render-phase work, not a DOM write yet.

---

## Why it exists

The real DOM is **expensive to touch at scale**: setting attributes, inserting nodes, or reading layout can trigger **style recalc, layout, and paint**. Imperative code (“find this node, update that node”) also forces **you** to track what changed.

React’s bet:

1. **Declarative:** write `UI = f(state)` — return a tree given current props/state.
2. **Describe cheaply:** elements are ordinary objects; creating them is JS, not layout.
3. **Mutate host sparingly:** compare descriptions, then apply a **minimal** list of host operations in commit.

The VDOM is the **description layer** that makes (1) and (3) possible. It is not a magic faster DOM.

---

## Why not just mutate the DOM directly?

You *can* (jQuery-style `document.querySelector`, `innerHTML`, `appendChild`). It does not scale as the UI grows:

- **Correctness:** you must remember every place that touches a node. Miss one update → stale UI. Two writers → fights.
- **Reasoning:** “render this tree from state” is easier to review and test than a pile of imperative patches.
- **Minimizing writes:** a diff can skip host work when the description did not change ([re-render vs DOM](../8.%20rerender-vs-dom/notes.md)).

Hand-optimized imperative DOM can still win **microbenchmarks**. React optimizes for **maintainable declarative UI + batched, heuristic updates that are good enough**, not “always fewer CPU cycles than a specialist.”

---

## The pipeline (precise version)

Popular one-liner: “React builds a new VDOM, diffs it against the previous VDOM, patches the DOM.”

More accurate for React 16+:

```text
JSX / createElement / jsx()
        ↓
React elements          ← throwaway description for this render (“VDOM”)
        ↓
Reconcile vs Fiber      ← persistent instances, state, host pointers
        ↓
Commit host mutations    ← real DOM (web) or native views (RN)
```

- **Elements:** cheap, often recreated every render. This is what people mean by virtual DOM.
- **Fibers:** long-lived; hold hooks state, `stateNode` (the DOM node), effect flags. React does **not** keep a second full copy of last render’s element objects as “the previous VDOM tree.” The **current fiber tree** is what last commit believed the UI to be.
- **DOM:** the browser tree. Only commit should write it (for React-managed nodes).

If an interviewer says “two virtual DOM trees,” start with the simple story, then qualify: **new element tree vs current fiber tree.**

Same model on **React Native**: elements describe UI; the host is native views, not `document`. The description layer is shared; the host is not.

---

## What “diff the VDOM” actually means

React does **not** walk the live DOM asking “what’s on screen?” to decide updates. It compares **intended trees** (new elements vs fibers / previous description) and then **tells** the host what to change.

That is why:

- A component can **re-render** (function runs, new elements) and still produce **no DOM mutation** if the description matches.
- Reading `div.textContent` in render to “see current UI” is the wrong layer — and a side effect.

Diff **heuristics** (type changes remount, keys in lists) belong in [reconciliation](../4.%20reconciliation/notes.md). Here you only need: **description in, planned host ops out; the document is not the source of truth during render.**

---

## “Virtual DOM is always faster” is false

Diffing **costs CPU**. Creating element objects **costs allocations**. For a tiny widget, direct `textContent =` can be cheaper than “render + reconcile + maybe commit.”

Say this **proactively**:

> The win is **ergonomics and a consistent update model** — I describe the next UI; React batches and applies host changes. It is **not** true that VDOM is always faster than the real DOM. Hand-tuned imperative code can win microbenchmarks. React’s heuristics aim for **maintainability at scale** plus **good-enough** host traffic.

Related: React still tries to **avoid unnecessary DOM writes** (the expensive part). That is “minimize host work,” not “JS object trees are free.”

---

## Common mistakes and misconceptions

- **JSX = VDOM.** JSX compiles to calls; the **objects** are the VDOM.
- **VDOM = Fiber.** Elements describe; fibers persist. Casual “virtual DOM” often mixes both — unpack if they push.
- **VDOM = the real DOM in disguise.** No `appendChild` on an element object. The host node is `fiber.stateNode` after commit.
- **“Always faster than DOM.”** False; see above.
- **Every render writes the DOM.** False; description can be equal ([re-render vs DOM](../8.%20rerender-vs-dom/notes.md)).
- **React reads the live DOM to diff.** It diffs descriptions / fibers, then writes.
- **Mutating a VDOM object after `createElement`.** Treat elements as immutable snapshots; mutation is undefined territory.

---

## Connections to other concepts

`JSX → elements (VDOM) → reconcile on fibers → commit DOM`

- **[Render vs commit](../2.%20render-vs-commit/notes.md):** building/diffing the description is render; host writes are commit.
- **[Fiber](../3.%20fiber/notes.md):** why the persistent tree exists (interruptible work, state lives on fibers).
- **[Reconciliation](../4.%20reconciliation/notes.md):** type/key heuristics on those trees.
- **[Purity](../5.%20pure-components/notes.md):** render must return a description without touching the host.
- **[Re-render vs DOM](../8.%20rerender-vs-dom/notes.md):** new element tree ≠ host mutation.

---

## Interview perspective

You should be able to:

1. Define VDOM as a **plain-object element tree**, not the document.
2. Separate **JSX** (syntax) from **elements** (result) from **DOM** (host).
3. Explain **why** the layer exists without claiming “always faster.”
4. Contrast **declarative** `f(state)` with **imperative** DOM surgery.
5. Qualify the “two VDOM trees” story with **elements vs Fiber** if they follow up.

Preserved spoken answer:

> The virtual DOM is a plain-JS-object tree that mirrors the intended UI. React builds a new VDOM tree on every render, diffs it against the previous tree (reconciliation), and computes the minimal set of real DOM mutations to apply. This lets me write declarative “render this given this state” code while React handles efficient DOM updates.

Add one sentence if they go deeper: “Those ‘VDOM’ objects are React elements from `createElement`/`jsx`; the tree React actually keeps across renders is Fiber. Diffing is not ‘VDOM is always faster than the DOM’ — host writes are expensive; the description layer is for declarative UI and minimizing those writes.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
