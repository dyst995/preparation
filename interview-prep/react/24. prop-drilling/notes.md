# Prop Drilling — When It’s Fine, When It’s a Smell

## What you need to know

**Prop drilling** means passing a prop through **intermediate components that don’t use it**, only so a deeper child can receive it.

It is **often over-diagnosed as “always bad.”** For **1–2 levels**, drilling is usually the simplest, most **explicit** data flow: you can find every consumer by searching for the prop name. Context and global stores hide that trail behind subscriptions.

It becomes a **smell** when depth grows, the same value fans out across unrelated branches, or intermediate APIs bloat with unused forwarding props.

**Fix order (preference):** composition → colocate state → Context → Zustand/Redux.

Prerequisites: [four kinds of state](../18.%20four-kinds-of-state/notes.md), [local state](../19.%20local-component-state/notes.md), [Context](../20.%20context/notes.md), [Zustand](../22.%20zustand/notes.md), [Redux Toolkit](../23.%20redux-toolkit/notes.md).

---

## What prop drilling looks like

```jsx
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} />;
}

function Layout({ user }) {
  return <Sidebar user={user} />; // Layout doesn't use user
}

function Sidebar({ user }) {
  return <UserMenu user={user} />; // Sidebar doesn't use user
}

function UserMenu({ user }) {
  return <span>{user?.name}</span>; // only real consumer
}
```

`Layout` and `Sidebar` exist only as relays. That is drilling.

**Not drilling:** a parent passes `title` to a child that *renders* `title`. Using a prop is not drilling.

---

## Why shallow drilling is often preferable

For 1–2 hops:

- **Explicit:** who gets the value is visible in JSX and prop types.
- **Traceable:** grep / “Find references” on the prop finds producers and consumers.
- **No indirection tax:** no Provider, no store, no “which context?”
- **Refactor-friendly at small scale:** change the prop once; TypeScript catches missed forwards.

Jumping to Context for “two levels of theme color” often adds more complexity than it removes.

---

## When drilling becomes a real problem (preserved)

1. **Depth ≳ ~3** and most intermediates have **no reason** to know about the prop.
2. The **same prop** must thread through **many unrelated branches** of the tree.
3. Intermediate **prop signatures balloon** just to forward values they don’t use → harder to read, easier to break on refactors.

Extra smell signals:

- Adding a new leaf requires editing every ancestor’s props.
- Half the props on a “layout” component are `…ForSomeDeepChild`.
- You’re tempted to invent a mega `props` bag just to forward everything.

---

## Fix 1: Component composition (preferred first)

Pass the deep UI as **`children`** (or a render prop / slot) so the intermediate **never sees** the drilled value.

**Before (drilling):**

```jsx
function Page({ user }) {
  return <Card user={user} />;
}
function Card({ user }) {
  return (
    <div className="card">
      <UserAvatar user={user} />
    </div>
  );
}
```

**After (composition):**

```jsx
function Page({ user }) {
  return (
    <Card>
      <UserAvatar user={user} />
    </Card>
  );
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}
```

`Card` is a shell. Ownership of `user` stays with `Page`, which already knows about `user`. Intermediates stop being relays.

**Render props / slots** are the same idea when you need multiple insertion points:

```jsx
function Modal({ header, children }) {
  return (
    <div className="modal">
      <header>{header}</header>
      <div>{children}</div>
    </div>
  );
}

// usage: header={<UserBadge user={user} />} — Modal never takes `user`
```

Composition doesn’t “hide” data flow; it **short-circuits** the middle of the tree so props don’t need to travel through components that aren’t about that data.

---

## Fix 2: Colocate state closer to where it’s used

Drilling sometimes means state was **lifted too high**.

If only `UserMenu` (and its subtree) needs `user` UI details that aren’t required at `App`, keep that state near `UserMenu` — or fetch with React Query in that feature — instead of owning everything at the root and drilling down.

**Lift when:** siblings must share.  
**Don’t lift “just in case”:** that creates artificial drilling.

```text
over-lifted state → long prop chains → smell
colocate → shorter chains → often no Context needed
```

---

## Fix 3: Context (cross-cutting, infrequent change)

Use Context when the value is **genuinely shared across a subtree**, changes **rarely or moderately**, and threading it through every branch would be noise (theme, locale, auth identity for many leaves).

Remember Context costs: consumers re-render when the Provider **value** changes — memoize / split contexts when needed ([Context notes](../20.%20context/notes.md)).

Don’t use Context as a default escape hatch for two-level props.

---

## Fix 4: Zustand / Redux (broad + frequent updates)

When many distant components need the same **client** state and it updates often enough that Context re-renders hurt — or the domain is complex enough for store conventions — use Zustand or RTK per the decision framework.

Still prefer composition/colocation first for *structural* drilling, not “I don’t want to pass one prop.”

---

## Mental model: explicit vs ambient access

| Approach | How child gets data | Traceability | Cost |
| --- | --- | --- | --- |
| Props (incl. shallow drill) | Parent passes | Excellent | Verbose at deep fan-out |
| Composition | Parent renders child with data; shells take `children` | Excellent | Requires thinking in slots |
| Context | Ambient Provider | Harder (subscription graph) | Re-render / API complexity |
| Store | Ambient hooks | Harder | Setup + conventions |

Interviewers want to hear that **explicit isn’t always worse** — and that the first fix is often **structure**, not a library.

---

## Interview answer (preserved)

**Q: Is prop drilling always bad?**

> “No — for 1–2 levels it’s often the simplest, most explicit option and easier to trace than a global store. It becomes a problem when it’s deep, spans many unrelated branches, or forces intermediate components to carry props they don’t use. My first fix is usually composition — passing components as `children`/props so intermediates don’t need to know about the data — before reaching for Context or a store.”

---

## Common mistakes and misconceptions

1. Treating any multi-level prop as a crime → premature Context/store.  
2. Jumping to Redux for “theme through Layout.”  
3. Forgetting composition: `children` often removes the need to drill.  
4. Lifting state to `App` “for flexibility” and then drilling everywhere.  
5. Confusing “parent passes props the child uses” with drilling.  
6. Using Context without addressing value identity / re-renders.  
7. Mega props objects (`{...everything}`) to “fix” drilling — hides the smell.

---

## Connections to other concepts

```
local state + props
  → default explicit flow

prop drilling smell
  → composition (children/slots)
  → colocation (don’t over-lift)
  → Context (rare cross-cutting)
  → Zustand / RTK (broad, frequent client)

four kinds of state
  → drilling is a *delivery* smell, not a new state kind
```

---

## Interview perspective

Be ready to:

1. Define drilling vs normal props.  
2. Argue when shallow drilling is *better* than Context.  
3. Rank fixes: composition → colocate → Context → store.  
4. Show a before/after composition example verbally.  
5. Tie to re-renders: Context/store are not free.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
