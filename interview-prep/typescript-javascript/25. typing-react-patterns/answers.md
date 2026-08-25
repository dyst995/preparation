# Typing React Patterns Precisely — Answers

## Core recall

1. **`React.ReactNode`** (flexible: elements, text, arrays, null, etc.).
2. Invalid variants become **compile errors** instead of silent wrong strings/CSS.
3. **`renderItem` / callbacks stay typed as `T`** — no `any`; inference from `items`.
4. Usually **`string`** (widened), not the literal `'idle'`.
5. **`useState<'idle' | 'loading' | …>('idle')`** (explicit type parameter).
6. A shared discriminant field (usually **`type`**) with different payloads per variant.
7. **DOM/node ref** (`useRef<El>(null)`) vs **mutable value box** (`useRef(0)`).
8. **`forwardRef<RefType, PropsType>`** — ref first, props second.
9. **`React.ChangeEvent<HTMLInputElement>`**.

## Explain why

1. If state stayed as literal `'idle'`, `setState('loading')` would be illegal. Widening to `string` makes the setter usable — at the cost of losing the closed set unless you annotate.
2. `?` only means “may be omitted” at the type level. Runtime default is from JS destructuring / default props behavior you write.
3. Narrowing: after `case 'increment'`, TS knows that variant includes `by`; reset variant doesn’t.
4. Refs are mutable escape hatches outside React’s state update → render cycle. Changing `.current` doesn’t schedule a render.
5. React’s generic event types tie `target`/`currentTarget` to the element; bare `Event` is too loose / wrong shape for `e.target.value`.
6. Call sites stay clean; `T` flows into callbacks so `u.name` type-checks when `items` is `User[]`.

## Compare and contrast

1. **`ReactNode`:** anything renderable. **`ReactElement`:** a single React element object — rejects plain strings/numbers as children.
2. **Inferred `string`:** any string settable. **Explicit union:** only listed statuses; typos fail compile.
3. **`useState`:** change → re-render. **`useRef`:** persist value, no re-render on `.current` write.
4. **DOM ref:** React sets `.current` to node/`null`. **Value ref:** you own `.current` as a mutable box.
5. **Custom prop callback:** your component’s API (`() => void`). **DOM handler:** React event object with element generics.
6. **Hand-written interface:** full control, may re-declare native props. **`ComponentProps<'button'>`:** inherit native button props, extend with your extras.

## Predict the output / resulting type

1. **`s` is `string`**; **`setS('loading')` type-checks** (any string).
2. **No** — `'done'` not in the union.
3. **No** — narrowed to `{ type: 'reset' }`, no `n`.
4. **`null`** (or `HTMLInputElement | null`) — not mounted yet.
5. **`number`** — `T` inferred from `[1, 2]`.

## Debugging

1. State widened to **`string`** — add explicit status union type parameter.
2. Type args **swapped** — use `forwardRef<HTMLInputElement, InputProps>`.
3. Initialize with **`null`**: `useRef<HTMLInputElement>(null)` for DOM refs.
4. With exhaustiveness checking / return type `State`, missing cases fail to type-check (or force `default` that shouldn’t accept `never`). Prefer `satisfies` / assert `never` in default for strong exhaustiveness.
5. Widen children to **`React.ReactNode`**.

## Application

1.
```ts
interface CardProps {
  title?: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'danger';
}
```

2.
```ts
interface SelectProps<T> {
  options: T[];
  getLabel: (t: T) => string;
  onSelect: (t: T) => void;
}
```

3.
```ts
const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
```

4.
```ts
type State = { text: string };
type Action = { type: 'setText'; text: string } | { type: 'clear' };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setText':
      return { text: action.text };
    case 'clear':
      return { text: '' };
  }
}
```

5.
```ts
function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  setValue(e.target.value);
}
```

6.
```tsx
const TextField = React.forwardRef<HTMLInputElement, { label: string }>(
  function TextField({ label }, ref) {
    return (
      <label>
        {label}
        <input ref={ref} />
      </label>
    );
  },
);
```

## Interview questions

1. **Spoken:** Initial `'idle'` widens to `string`, so invalid statuses type-check. Fix with `useState<Union>('idle')`.  
   **Follow-ups:** Free-form text inputs should stay `string`.

2. **Spoken:** Generic props `items: T[]` + `renderItem: (item: T) => ReactNode`; infer `T` from `items`.

3. **Spoken:** Discriminated union of actions; `switch (action.type)` narrows payloads; type `dispatch` via `useReducer`.

4. **Spoken:** DOM: `useRef<El>(null)`. Mutable box: `useRef(initial)`. Latter doesn’t re-render on write.

5. **Spoken:** `forwardRef<HTMLInputElement, Props>(…)`; parent `useRef<HTMLInputElement>(null)`.

6. **Spoken:** `React.ChangeEvent<HTMLInputElement>` or let JSX infer the handler parameter.

## Connections

1. Action `type` field is the discriminant; same narrowing as chapter-3 unions.
2. Function/component generics + argument inference from the constraining field (`items`).
3. Both fights unwanted widening: closed string sets need explicit unions (props or `useState`).
4. You narrow/guard `ref.current` before use (`if (ref.current) …`) because of `null`.
5. Props types erase; malicious/invalid user data still needs validation/sanitization at runtime.
