# Prop Drilling — Answers

## Core recall

1. Passing a prop through intermediates that don’t use it, only so a deep child can.  
2. About 1–2 levels — simple, explicit, easy to trace.  
3. Depth ≳ ~3 with unused intermediates; same prop across many unrelated branches; ballooning unused forwarding props (any three along those lines).  
4. Composition → colocate state → Context → Zustand/Redux.  
5. Parent renders the consumer with the prop; shell only receives `children` / slots and never takes the drilled prop.  
6. State owned too high must be passed down through layers that don’t need it.  
7. Genuinely cross-cutting subtree value, especially if infrequent or carefully memoized.  
8. Broad client state that updates often / is complex enough that Context re-renders or conventions hurt — use a store.

## Explain why

1. Shallow explicit props are often clearer than ambient global state; “bad” usually means *deep / sprawling* drilling.  
2. Grep/prop types show the path; Context requires tracing Providers and who `useContext`s.  
3. Composition removes relays without new subscription/re-render machinery.  
4. The child *uses* the prop — that’s normal data flow, not a relay smell.  
5. Premature lift creates long chains for a single consumer; YAGNI.  
6. It hides which values matter, still forces intermediates to accept the bag, and weakens typing/readability.

## Compare and contrast

1. **Drilling:** unused relays. **Normal:** each hop uses or meaningfully owns the prop.  
2. **Composition:** structural — no ambient value. **Context:** ambient — any depth can read, with re-render costs.  
3. **Colocate:** short paths, local ownership. **Over-lift + drill:** long paths for convenience that never paid off.  
4. **Context:** good for rare/shared config-like values. **Zustand:** selector subscriptions for broader/frequently updated client state.  
5. **Props:** visible dependencies. **Store:** hidden coupling + power for distant updates.

## Predict / choose

1. Mild/not really a smell at 2 hops; keep props or compose if a shell is in the middle. Don’t Context for `onClick`.  
2. Context (auth) or store if auth/client session is rich/updated — not 12-way drilling.  
3. `<Card><UserAvatar user={user} /></Card>` — Card takes `children`.  
4. **Context** (theme) — don’t drill six levels.

## Debugging

1. Classic deep multi-value drilling — prefer composition/slots; Context for true cross-cuts (theme/locale); don’t forward everything on layouts.  
2. Overkill — two levels of one consumer: pass the prop or compose.  
3. Over-lifted state — move state down next to the real consumer (or lift only when second sibling appears).  
4. Invert control: `Dashboard` composes `Widget` with needed props; `Panel` as shell with `children`; or colocate widget data.

## Application

1. Example shape:
```jsx
function App({ user }) {
  return (
    <Layout>
      <Sidebar>
        <UserMenu user={user} />
      </Sidebar>
    </Layout>
  );
}
// Layout/Sidebar only render children
```

2. Shared filter between two siblings → lift to their common parent (short drill). Only one panel → keep state in that panel.  
3. Paraphrase preserved answer: not always bad; 1–2 levels OK; smell when deep/multi-branch/bloated; fix composition first.  
4. `<Modal header={...}><UserForm userId={userId} /></Modal>` — Modal doesn’t take `userId`.

## Interview questions

1. **Spoken:** No — shallow drilling is explicit and traceable. Problem when deep, multi-branch, or unused forwarding props. First fix: composition (`children`/slots). Then colocate. Context for cross-cutting infrequent values; Zustand/RTK when broad + frequent/complex client state.  
2. **Spoken:** Props by default; Context for ambient rare shared values; Zustand/RTK when many distant consumers + update patterns need selectors/structure — after composition/colocation.  
3. **Spoken:** Shells take `children`; parent that owns data renders the leaf with props so middles aren’t relays.  
4. **Spoken:** Drilling itself isn’t a React perf bug; pain is maintainability. Perf issues appear when the *alternative* (unstable Context values, fat selectors) is misused — or when lifting causes huge trees to re-render because parent state sits too high.

## Connections

1. Delivery mechanism for whatever state kind you chose — pick tool from the table, then prefer props/composition before ambient APIs.  
2. Context re-renders all consumers on value change — so it’s not a free “delete all props” button.  
3. Presentational shells (`Card`, `Layout`) should accept structure (`children`), not domain props they don’t use.  
4. Default to local state + short props; drilling smell often means you violated colocation by lifting too early.
