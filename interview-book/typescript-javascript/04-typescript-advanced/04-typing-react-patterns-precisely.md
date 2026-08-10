# 04. Typing React patterns precisely

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] Component props typing: plain interface, `children` typing (`React.ReactNode`), optional/default props
- [ ] Generic components (e.g. a `<List<T>>` component)
- [ ] Typing `useState`, including the "widen vs narrow initial value" trap
- [ ] Typing `useReducer` with a discriminated union of actions
- [ ] Typing `useRef` for DOM nodes vs mutable value refs (the two different overloads)
- [ ] `forwardRef` generic typing
- [ ] Typing event handlers (`React.ChangeEvent<HTMLInputElement>`, etc.)

### Props and children

```tsx
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary'; // optional, union-constrained, not a loose string
  children?: React.ReactNode;
}

function Button({ label, onPress, variant = 'primary', children }: ButtonProps) {
  return <button onClick={onPress} className={variant}>{label}{children}</button>;
}
```

Using a union (`'primary' | 'secondary'`) instead of `string` for `variant` is a small but telling detail - it makes invalid values a compile error instead of a silent runtime string mismatch.

### Generic components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <>
      {items.map(item => <div key={keyExtractor(item)}>{renderItem(item)}</div>)}
    </>
  );
}

// Usage - T is inferred as User from the items array
<List items={users} renderItem={u => <span>{u.name}</span>} keyExtractor={u => u.id} />
```

### `useState` widening trap

```ts
const [status, setStatus] = useState('idle');
// inferred type is string, NOT 'idle' - so setStatus('anything') compiles fine,
// even though only 'idle' | 'loading' | 'success' | 'error' are actually valid

const [status2, setStatus2] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
// now setStatus2('anything') is a compile error - the type is explicit, not widened
```

TypeScript widens literal initial values passed to `useState` to their general primitive type by default, because otherwise reassigning to any other literal would be impossible - so for any state with a fixed, meaningful set of values, an explicit type parameter is required, not optional polish.

### `useReducer` with a discriminated union of actions

```ts
type State = { count: number };
type Action =
  | { type: 'increment'; by: number }
  | { type: 'decrement'; by: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { count: state.count + action.by };
    case 'decrement': return { count: state.count - action.by };
    case 'reset': return { count: 0 };
  }
}
```

This is the exact same discriminated-union pattern from chapter 3, applied to Redux-style reducers - `action.by` is only accessible in the branches where it actually exists on the type.

### `useRef`'s two overloads

```ts
const inputRef = useRef<HTMLInputElement>(null);
// type: RefObject<HTMLInputElement> - .current is read-only from the type's perspective
// (React sets it internally); typical use: DOM node access

const countRef = useRef(0);
// type: MutableRefObject<number> - .current is fully mutable by you;
// typical use: a mutable value that survives re-renders without triggering one
```

### Interview question

**Q: Why does `useState('idle')` sometimes cause a confusing type error later, and how do you fix it?**

**Strong answer:**
> "TypeScript infers the type from the initial value, and for a string literal like `'idle'` it widens the inferred type to plain `string` rather than the literal `'idle'` - otherwise you could never call the setter with any other value. That means if the intent was a small fixed set of states, nothing stops an invalid string from being set later, and the compiler won't catch it. The fix is to pass an explicit type parameter, `useState<'idle' | 'loading' | 'success' | 'error'>('idle')`, which locks the state to exactly the valid set and makes typos or invalid transitions a compile-time error."

---
