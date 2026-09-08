# Virtual DOM — Answers

## Core recall

1. An in-memory **tree of React elements** (plain objects) describing the intended UI. React diffs that description and applies **minimal host (DOM) updates** — it is a description layer, not a faster document.
2. **`type`**, **`props`** (including children), **`key`**. (`ref` / `$$typeof` exist; not required in the spoken definition.)
3. **No.** The element is a description. The real node is the **host instance** (e.g. `fiber.stateNode` after commit) — `HTMLButtonElement` on the web.
4. Function calls (`React.createElement` or the automatic `jsx`/`jsxs` runtime) that **return elements**. JSX is **syntax**, not the VDOM.
5. **`'button'`:** host leaf — maps to a DOM (or native) node. **`SaveButton`:** composite — React **calls** that function/class; its return value is more elements.
6. **New objects** almost every render. Element identity is not “the same button across updates.”
7. Against the **current Fiber tree** (what last commit believed), not a stored full copy of last render’s element objects.
8. Mutations / layout reads can trigger **style recalc, layout, and paint** — expensive compared to allocating small JS objects.

## Explain why

1. So you can write **declarative** `UI = f(state)` and let React **minimize host writes**, instead of you tracking every DOM patch.
2. Diffing and allocating elements **cost CPU**. Tiny imperative updates can win microbenchmarks. The product is maintainability + a consistent batched model, not a universal speed win.
3. JS object allocation is usually cheap vs **layout/paint**. Recreating descriptions is the point of the model; host work is what you try to skip.
4. You must manually know **what changed**. Missed updates, double writers, and tangled `querySelector` chains become correctness bugs.
5. JSX **disappears at compile time**. The runtime value is the **element object**. Confusing source syntax with the data structure.
6. The **intended tree** (elements vs fibers) is the source of truth for the next UI. The live DOM is an **output** of commit, not the input to diff.

## Compare and contrast

1. **Element:** JS description (`type`/`props`). **DOM node:** browser object in the document, layout/paint, APIs like `appendChild`.
2. **JSX:** source sugar. **`createElement`/`jsx`:** the call. **Element tree:** the objects those calls return (VDOM).
3. **Host:** platform node. **Composite:** “run this component”; not a DOM tag by itself.
4. **Element:** throwaway snapshot this render. **Fiber:** persistent unit of work — state, host pointer, links, effect flags.
5. Teaching lie: two full element trees. Precise: **new elements** vs **current fibers**.
6. **Declarative:** return the next tree. **Imperative:** issue patches yourself and remember them.

## Predict the output

1. **React element** (after compile, `createElement`/`jsx` result) — not a live `HTMLButtonElement`.
2. **`SaveButton`** (the function). Props include `onSave`. React has not necessarily run the function yet; the parent returned a composite element.
3. **`'button'`** (host string).
4. **Not necessarily.** If the description for that `p` is the same, commit can skip rewriting text. New element objects ≠ “must touch DOM.”

## Debugging

1. Agree VDOM exists to describe UI and **reduce host writes**, then: **not always faster**; diff has cost; vanilla can win microbenchmarks; React’s bet is declarative UI at scale.
2. Elements are **snapshots**. Don’t mutate them; return a new tree next render. Mutation isn’t how React tracks updates.
3. Casual “VDOM” lumps **elements + fibers**. Split: elements describe; Fiber is the reconciler’s persistent tree.
4. The document is not a “copy you can ignore.” React-managed nodes should be updated by **commit** from the description. Imperative DOM in **render** fights the model (side effects, StrictMode, concurrent discard).

## Application

1. `React.createElement('button', { className: 'btn', onClick: fn }, 'Save')` — or `jsx('button', { className: 'btn', onClick: fn, children: 'Save' })`.
2. JSX → **elements (VDOM)** → **Fiber** → **DOM/host**. Interview “virtual DOM” = the element tree.
3. After `setState`, return the next JSX tree; React diffs and patches. Querying the DOM to “sync” duplicates the source of truth and skips the description layer.
4. **Value:** declarative UI + minimized host updates. **Not:** a guarantee that object trees beat hand-tuned DOM on speed.

## Interview questions

1. **Spoken:** Virtual DOM is a plain-object tree of React elements describing intended UI. Each render returns a new tree; React diffs and applies minimal DOM mutations so I write `f(state)` instead of imperative patches.  
   **Follow-ups:** Not always faster. JSX only produces those objects.

2. **Spoken:** JSX becomes `createElement`/`jsx` → element objects. Composite `type` means React calls the component; host `type` is a platform node. That tree is the description; Fiber/commit come next.

3. **Spoken:** Manual DOM tracking doesn’t scale — missed updates, tangled writers. Declarative trees + diff keep one story of “what the UI should be.”

4. **Spoken:** Element = this render’s description. Fiber = persistent instance: hooks/state, DOM pointer, work flags. We recreate elements; we reuse fibers.

5. **Spoken:** That’s the classroom version. Tighter: new **element** tree vs **current fiber** tree; then commit writes the host.

## Connections

1. Render only **computes a description**. Touching the DOM during that computation is a side effect — purity is “return elements, don’t write host.”
2. Reconciliation can find **equal** descriptions → no host ops even though new objects were created.
3. `type` (and `key` among siblings) are **on the element**; heuristics use them to reuse vs remount.
4. Elements don’t hold hooks or a stable host pointer across renders. Fiber does, and can be walked incrementally.
5. **Same** element/Fiber story; **host** is native views, not `document`. Don’t say “VDOM means the HTML DOM.”
