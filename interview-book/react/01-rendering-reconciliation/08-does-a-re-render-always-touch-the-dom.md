# 08. Does a re-render always touch the DOM?

> Source: `interview-prep/react/01-rendering-reconciliation.md`

**No.** A "re-render" means React called your component function again and computed a new element tree during the render phase. Whether that produces any **DOM mutation** depends entirely on whether the reconciliation diff finds actual differences.

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <StaticChild />   {/* re-renders (function called again) but produces identical output -> no DOM change for this subtree, assuming no memo bail-out even happened */}
    </div>
  );
}
```

Without `memo`, `StaticChild`'s function body **is called again** on every `Parent` re-render (this is "re-rendering" in the strict sense), but if its output is identical to before, the **commit phase applies zero DOM mutations** for that subtree - React still did the diff work, but found nothing to change.

This distinction matters for performance conversations (chapter 04): `React.memo` avoids the **render call itself** (skips calling the function at all if props are shallow-equal), which is a different optimization than "the diff found no changes" (which still costs CPU time to compute, just skips DOM writes).

### Interview question

**Q: If a child component's output doesn't change, does the DOM update?**

> "Not necessarily. Re-render means the component function ran again during the render phase and produced a new element tree - but if reconciliation finds that tree is equivalent to the previous one, no DOM mutations happen in the commit phase. That's different from `React.memo`, which skips calling the component function entirely when props are shallow-equal, avoiding both the render call and the diff work, not just the DOM write."

---
