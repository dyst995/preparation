# React.memo — Answers

## Core recall

1. HOC that skips calling the wrapped component’s render when props are equal to last time (shallow or custom).  
2. Shallow compare of each prop with `Object.is`.  
3. Inline objects, arrays, and functions (new references each render).  
4. Expensive to render **and** often re-renders with unchanged props.  
5. Cheap components, or props that always change when the parent renders.  
6. No — own state (and context) still trigger renders.  
7. Return `true` if props are equal → skip render.  
8. `children` is usually a new element reference every parent render → shallow compare fails.

## Explain why

1. Two literals are different references; `Object.is` does not deep-compare fields.  
2. Parent keeps passing new references → comparison always fails → child always renders.  
3. Shallow compare work can exceed the cheap render; net loss.  
4. Adds comparison cost + complexity; often no bottleneck; can chase unstable props forever.  
5. If parent shouldn’t re-render for that state, fewer wasted child renders without memo machinery.  
6. Parent (and other children) still ran; only the memoized subtree may bail out.

## Compare and contrast

1. **`memo`:** bail out a **component** render. **`useMemo`:** cache a **value** between renders of the *same* component.  
2. **`memo`:** component-level. **`useCallback`:** stable **function** identity (often so a memoized child doesn’t see a new prop).  
3. Same idea: shallow prop bailout; `PureComponent` is the class form.  
4. Primitive stable → bailout can hit. Inline object → always “changed.”  
5. Stabilizing props is usually clearer/cheaper; deep custom compare is easy to get wrong and can be expensive.

## Predict the output

1. **No** (for that Child) — `n` unchanged primitive → shallow equal → skip.  
2. **Yes** — new `style` object each time → props unequal.  
3. **Skip** if other props equal — `useCallback` keeps same function reference.  
4. **Yes** — context updates bypass prop memo; component still re-renders for context.

## Debugging

1. Inline `onSelect` new every keystroke → defeats `memo`. Use `useCallback`, pass `id`+stable handler, or don’t pass new closures per row carelessly.  
2. Memo doesn’t help if props always change or work isn’t “extra re-renders” — optimize the computation / defer / virtualize; profile the real cost.  
3. Never bail out — behaves like no memo (always re-render).  
4. Mutation keeps same reference → shallow equal thinks props unchanged → stale UI. Need immutable updates / new reference when data changes.

## Application

1. Example:
```jsx
const UserBadge = React.memo(function UserBadge({ name, onClick }) {
  return <button onClick={onClick}>{name}</button>;
});
function Parent() {
  const onClick = useCallback(() => {}, []);
  return <UserBadge name="Ada" onClick={onClick} />;
}
```

2. `<UserBadge name="Ada" onClick={() => {}} />` or `data={{}}`.  
3. Colocate state so parent doesn’t re-render; stop passing the callback; split the hot state into a sibling.  
4. Unstable prop references; shallow compare fails; stabilize or restructure.

## Interview questions

1. **Spoken:** Usually a new object/array/function prop each parent render; shallow compare sees a change. Fix: `useMemo`/`useCallback` or remove/restructure the prop (colocate). Don’t bother if the child is cheap or props always change — measure first.  
2. **Spoken:** Extra shallow (or custom) comparison on every parent render; complexity; can hide structural issues.  
3. **Spoken:** `memo` skips a child component; `useMemo` caches a computed value inside a render; often used together when that value is passed as a prop.  
4. **Spoken:** Profile: parent re-renders a lot, row is expensive, row props usually stable (id/data references). If row props churn every time, memo won’t pay; fix data identity or virtualize.

## Connections

1. Bail out avoids render work; DOM may already be fine either way — `memo` targets wasted **JS render**, not “DOM always updates.”  
2. They stabilize prop identities so `memo`’s shallow compare can succeed.  
3. Only add `memo` when Profiler shows expensive, avoidable re-renders — not prophylactically.  
4. Hot state high in the tree re-renders large subtrees → people slap `memo` on everything instead of narrowing ownership first.
