# Typing React Patterns Precisely — Self-test

## Core recall

1. What type is usually used for flexible React `children`?
2. Why prefer `'primary' | 'secondary'` over `string` for a variant prop?
3. What does a generic `List<T>` buy you for `renderItem`?
4. What type does `useState('idle')` typically infer for state?
5. How do you lock `useState` to a fixed status union?
6. What makes `Action` in a reducer a discriminated union?
7. What are the two common `useRef` intents?
8. What is the type-parameter order for `forwardRef`?
9. What event type is typical for `<input onChange>`?

## Explain why

1. Why does TypeScript widen `'idle'` to `string` in `useState`?
2. Why don’t optional props (`variant?: …`) provide runtime defaults by themselves?
3. Why does `action.by` type-check only in some `switch` branches?
4. Why doesn’t updating `countRef.current` re-render the component?
5. Why type `ChangeEvent<HTMLInputElement>` instead of a bare `Event`?
6. Why is generic inference from `items` useful on `List`?

## Compare and contrast

1. `React.ReactNode` vs `React.ReactElement`  
2. `useState` with inferred `string` vs explicit status union  
3. `useState` vs `useRef` for a value that must survive renders  
4. DOM `useRef<HTMLInputElement>(null)` vs `useRef(0)`  
5. Prop callback `onPress: () => void` vs DOM `onClick: MouseEventHandler`  
6. Typing props with `interface` vs extending `ComponentProps<'button'>`

## Predict the output / resulting type

1.
```ts
const [s, setS] = useState('idle');
// type of s? does setS('loading') type-check?
```

2.
```ts
const [s, setS] = useState<'idle' | 'loading'>('idle');
// does setS('done') type-check?
```

3.
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

4.
```ts
const r = useRef<HTMLInputElement>(null);
// what is a typical type of r.current before mount?
```

5.
```tsx
function List<T>({ items, renderItem }: { items: T[]; renderItem: (i: T) => React.ReactNode }) {
  return <>{items.map(renderItem)}</>;
}
<List items={[1, 2]} renderItem={(n) => <span>{n.toFixed(1)}</span>} />
// type of n inside renderItem?
```

## Debugging

1. `setStatus('error')` is allowed but `'error'` isn’t a real app state — only idle/loading/success exist. What’s wrong?

2. `forwardRef<InputProps, HTMLInputElement>` — ref typing breaks. Why?

3. `useRef<HTMLInputElement>()` without `null` — awkward `.current` typing / usage. What’s the usual fix for DOM refs?

4. Reducer `default` branch returns `state` but a new action type was added to the union and forgotten in `switch` — how do types help?

5. `children: React.ReactElement` rejects text children `"Save"`. What change?

## Application

1. Type a `Card` props interface with optional `title: string`, `children: React.ReactNode`, and `tone?: 'neutral' | 'danger'`.

2. Write a generic `Select<T>` props shape: `options: T[]`, `getLabel: (t: T) => string`, `onSelect: (t: T) => void`.

3. Declare a status state with `useState` limited to `'idle' | 'saving' | 'saved'`.

4. Write `State` / `Action` / `reducer` for a text field: actions `setText` (payload string) and `clear`.

5. Type an input `onChange` handler that sets string state from `e.target.value`.

6. Wrap a styled `<input>` with `forwardRef` so parents can focus it.

## Interview questions

1. Why does `useState('idle')` sometimes cause confusing typing later, and how do you fix it?  
   **Follow-ups:** When is plain `string` fine?

2. How do you type a reusable list component that renders arbitrary item types?

3. How do you type `useReducer` actions safely?

4. Explain the two ways people use `useRef` and how typing differs.

5. How do you type `forwardRef` for a custom input?

6. How do you type an input change handler in React + TS?

## Connections

1. How do discriminated unions from the unions unit show up in React reducers?
2. How does generic inference here match the generics unit?
3. How does literal widening relate to preferring union props for variants?
4. How is `ref.current === null` related to narrowing?
5. Why doesn’t TypeScript props typing replace runtime validation for user input?
