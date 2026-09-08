# Typing React Patterns Precisely

## What you need to know

React + TypeScript is mostly **props**, **hooks**, and **events**. Interviews probe whether you:

- constrain props with unions (not loose `string`);
- use **generics** on list-like components;
- avoid the **`useState` literal widening** trap;
- type reducers with **discriminated unions**;
- pick the right **`useRef`** overload (DOM vs mutable box);
- type **`forwardRef`** and DOM events.

Curriculum checklist:

- Props / `children` (`React.ReactNode`), optional + defaults
- Generic components (`List<T>`)
- `useState` widen vs narrow
- `useReducer` + action unions
- `useRef` two overloads
- `forwardRef` generics
- Event handler types (`ChangeEvent`, etc.)

Prerequisites: [generics](../18.%20generics/notes.md), [unions / discriminated unions](../16.%20unions-intersections-discriminated/notes.md), [narrowing](../17.%20narrowing-and-type-guards/notes.md).

---

## Props and children

```tsx
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  children?: React.ReactNode;
}

function Button({ label, onPress, variant = 'primary', children }: ButtonProps) {
  return (
    <button onClick={onPress} className={variant}>
      {label}
      {children}
    </button>
  );
}
```

### Mental model

Props are a normal object type (usually `interface`). Optional props use `?`; defaults live in the **destructuring** (`variant = 'primary'`), not in the type system as “default values.”

**`React.ReactNode`** — anything React can render: elements, strings, numbers, arrays, `null`, `undefined`, booleans (mostly ignored when rendering). Prefer it for `children` unless you need a stricter shape.

| Type | Typical use |
| --- | --- |
| `React.ReactNode` | Flexible `children` |
| `React.ReactElement` | Single element only |
| `string` | Text-only children |

### Why union `variant`, not `string`

`'primary' | 'secondary'` makes typos and invalid variants **compile errors**. `string` only fails at runtime (wrong CSS class). Small detail, strong signal in reviews.

---

## Generic components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <>
      {items.map((item) => (
        <div key={keyExtractor(item)}>{renderItem(item)}</div>
      ))}
    </>
  );
}

// T inferred as User from items
<List items={users} renderItem={(u) => <span>{u.name}</span>} keyExtractor={(u) => u.id} />
```

### How inference works

`T` is inferred from `items` (and checked against callbacks). Callers rarely write `<List<User>…>` unless inference needs a nudge.

**Why it matters:** One reusable component stays typed for `User`, `Product`, etc., without `any` in `renderItem`.

---

## `useState` widening trap

```ts
const [status, setStatus] = useState('idle');
// status: string  — widened!

const [status2, setStatus2] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
// status2: 'idle' | 'loading' | 'success' | 'error'
```

### Why widening happens

If TS inferred `status` as the literal `'idle'`, then `setStatus('loading')` would be a type error — the only assignable value would be `'idle'`. So inference **widens** string/number/boolean literals to `string` / `number` / `boolean` for `useState`’s initial value, making the setter usable.

### Practical rule

For a **closed set of states**, pass an explicit type argument (or `as const` patterns / const object maps). For open text (`useState('')` for an input), plain `string` is correct.

### Interview answer (preserved)

> TS infers from the initial value; `'idle'` widens to `string` so other values can be set. That won’t catch invalid statuses. Fix: `useState<'idle' | 'loading' | 'success' | 'error'>('idle')`.

Related: object/array initials can also be looser than you intend — annotate when the shape is a fixed state machine.

---

## `useReducer` with discriminated union actions

```ts
type State = { count: number };
type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + action.by };
    case 'decrement':
      return { count: state.count - action.by };
    case 'reset':
      return { count: 0 };
  }
}
```

Same pattern as Redux-style reducers: discriminant `type` narrows so `action.by` exists only on increment/decrement branches.

`useReducer(reducer, initialState)` then types `dispatch` to accept only valid `Action`s.

**Exhaustiveness:** with `strict` / no implicit returns, missing a `case` can error if you don’t return `State` on all paths — good pressure to handle every action.

---

## `useRef`: two overloads

```ts
const inputRef = useRef<HTMLInputElement>(null);
// RefObject-style: React fills .current with the DOM node (or null)
// Typical: read the node in effects / handlers

const countRef = useRef(0);
// MutableRefObject-style: you read/write .current yourself
// Typical: instance variable that persists across renders without re-render
```

### Mental model

| Call | Intent |
| --- | --- |
| `useRef<Element>(null)` | DOM / component ref callback target |
| `useRef(initialValue)` | Mutable box (`timerId`, previous props, etc.) |

DOM refs are often typed so you’re reminded `.current` may be `null` until mount (and after unmount).

**Note:** Exact `RefObject` vs `MutableRefObject` wording has shifted across `@types/react` / React 19, but interviews still want: **null-initialized element ref** vs **mutable value ref**.

Don’t use a value ref when you mean state that should re-render — changing `.current` does **not** trigger a render.

---

## `forwardRef` generic typing

Expose an inner DOM node (or child handle) to parents:

```tsx
interface InputProps {
  label: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label },
  ref,
) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
});

// Parent
const ref = useRef<HTMLInputElement>(null);
<Input ref={ref} label="Email" />;
```

Order of type params is easy to flip: **`forwardRef<RefType, PropsType>`** — ref element first, props second.

(React 19 can pass `ref` as a normal prop in some setups; many codebases still use `forwardRef` — know the classic generic order.)

---

## Typing event handlers

```tsx
function onChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log(e.target.value); // string, typed
}

function onClick(e: React.MouseEvent<HTMLButtonElement>) {
  e.preventDefault();
}
```

Common ones:

| Event | Type |
| --- | --- |
| `<input onChange>` | `ChangeEvent<HTMLInputElement>` |
| `<form onSubmit>` | `FormEvent<HTMLFormElement>` |
| click | `MouseEvent<HTMLButtonElement>` (or element used) |
| keyboard | `KeyboardEvent<HTMLInputElement>` |

Prefer these over `any` or untyped `e`, so `e.target` / `e.currentTarget` match the element. For delegated handlers, `currentTarget` is usually the safer typed element.

You can also inline without annotating if the JSX prop context infers the handler type:

```tsx
<input onChange={(e) => setValue(e.target.value)} />
```

---

## Optional extras that show up in practice

- **`ComponentProps<'button'>`** / `React.ComponentPropsWithoutRef<'button'>` — extend native element props instead of re-declaring `className`, `disabled`, etc.
- **`PropsWithChildren<P>`** — `P & { children?: ReactNode }` helper.
- Typing **async** click handlers: return type `void | Promise<void>` is fine; don’t pretend events wait on the promise unless you handle errors.

Stay focused on the curriculum list in interviews; these are supporting tools.

---

## Common mistakes and misconceptions

1. `variant: string` when a union is intended.  
2. Leaving `useState('idle')` as `string` for a state machine.  
3. Using `any` for list `renderItem` instead of `List<T>`.  
4. Confusing DOM `useRef(null)` with mutable `useRef(0)` (or expecting ref updates to re-render).  
5. Swapping `forwardRef` type parameters (`Props` first by mistake).  
6. Typing events as `Event` from DOM lib without the React generic element.  
7. Putting default prop values only in the type (`variant?: …` does not set a runtime default).

---

## Connections to other concepts

```
union literals
  → prop variants, useState status machines

discriminated unions + narrowing
  → useReducer actions

generics + inference
  → List<T>, forwardRef<Ref, Props>

nullability
  → ref.current possibly null until mount
```

---

## Interview perspective

You should be able to:

1. Type a component’s props + `children` cleanly.  
2. Explain and fix `useState('idle')` widening.  
3. Sketch a typed reducer with action unions.  
4. Contrast the two `useRef` intents.  
5. Write `forwardRef<HTMLInputElement, Props>` in the right order.  
6. Name `ChangeEvent<HTMLInputElement>` for inputs.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
