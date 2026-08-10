# 07. Prop drilling - when it's fine, and when it's a smell

> Source: `interview-prep/react/03-state-data-fetching.md`

Prop drilling (passing a prop through several intermediate components that don't use it themselves, just to reach a deep child) is often over-diagnosed as "bad" - it's actually **fine and often preferable** for 1-2 levels, because it keeps data flow explicit and traceable (you can find every consumer of a value with a simple search of prop usage, unlike Context/global state which requires tracing subscriptions).

**It becomes a real problem when:**
- Depth exceeds ~3 levels and most intermediate components have no reason to know about the prop.
- The same prop needs to be threaded through many different unrelated branches of the tree.
- Intermediate components' prop signatures balloon just to forward values they don't use, hurting readability and making refactors error-prone.

**Fixes, in order of preference:**
1. **Component composition** - pass the deep child as `children` or a render prop to the intermediate component, so the intermediate component doesn't need to know about the prop at all (it just renders whatever `children` it's given).
2. **Colocate state closer to where it's used** - sometimes drilling is a sign the state is lifted higher than it needs to be.
3. **Context** - for genuinely cross-cutting, infrequently-changing values.
4. **Zustand/Redux** - for state needed broadly and updated more frequently, per the framework above.

### Interview question

**Q: Is prop drilling always bad?**

> "No - for 1-2 levels it's often the simplest, most explicit option and easier to trace than a global store. It becomes a problem when it's deep, spans many unrelated branches, or forces intermediate components to carry props they don't use. My first fix is usually composition - passing components as `children`/props so intermediates don't need to know about the data - before reaching for Context or a store."

---
