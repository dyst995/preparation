# Typing React Patterns Precisely — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What type is usually used for flexible React `children`? Why prefer `'primary' | 'secondary'` over `string` for a variant prop?
- [ ] What type does `useState('idle')` typically infer for state? How do you lock `useState` to a fixed status union?
- [ ] What are the two common `useRef` intents? What is the type-parameter order for `forwardRef`?
- [ ] Why does TypeScript widen `'idle'` to `string` in `useState`?
- [ ] `React.ReactNode` vs `React.ReactElement`. `useState` vs `useRef` for a value that must survive renders.

## Predict / debug

What is the resulting type? State the result and explain why.

- [ ]
```ts
const [s, setS] = useState('idle');
// type of s? does setS('loading') type-check?
```

- [ ]
```ts
const [s, setS] = useState<'idle' | 'loading'>('idle');
// does setS('done') type-check?
```

- [ ]
```ts
type Action = { type: 'reset' } | { type: 'add'; n: number };
function reducer(state: number, action: Action) {
  switch (action.type) {
    case 'reset':
      return 0;
    case 'add':
      return state + action.n;
  }
}
// In case 'reset', is action.n available?
```

- [ ]
```tsx
function List<T>({ items, renderItem }: { items: T[]; renderItem: (i: T) => React.ReactNode }) {
  return <>{items.map(renderItem)}</>;
}
<List items={[1, 2]} renderItem={(n) => <span>{n.toFixed(1)}</span>} />
// type of n inside renderItem?
```

- [ ] `forwardRef<InputProps, HTMLInputElement>` — ref typing breaks. Diagnose why.

## Say it out loud

- [ ] Explain typing React patterns in 30–60 seconds as if an interviewer asked.
- [ ] Why does `useState('idle')` sometimes cause confusing typing later, and how do you fix it? Follow-ups: When is plain `string` fine?
- [ ] Explain the two ways people use `useRef` and how typing differs.
