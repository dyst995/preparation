# 01. Controlled vs uncontrolled inputs

> Source: `interview-prep/react/05-forms-ui-css.md`

### Controlled inputs

The input's value is driven entirely by React state - the DOM element's `value` always reflects `state`, and every keystroke goes through `onChange` to update that state.

```jsx
function ControlledInput() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

**Pros:** single source of truth in React state, easy to validate/transform on every keystroke, easy to programmatically reset/set the value, easy to derive other UI (character count, live preview) from the same state.

**Cons:** every keystroke triggers a re-render of the owning component (and anything that re-renders with it, unless properly isolated) - can matter for very large forms or expensive surrounding UI.

### Uncontrolled inputs

The DOM manages the input's own value internally; React reads it only when needed (usually via a `ref`, often at submit time), not on every keystroke.

```jsx
function UncontrolledInput() {
  const inputRef = useRef(null);
  function handleSubmit(e) {
    e.preventDefault();
    console.log(inputRef.current.value);
  }
  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Pros:** no re-render per keystroke, less code for simple "just read it on submit" cases, closer to native HTML form behavior (works well with native form validation attributes and `FormData`).

**Cons:** harder to validate/react live per keystroke, harder to programmatically control the value from outside, easy to accidentally mix controlled/uncontrolled patterns (see next section).

### Decision table

| Need | Choice |
|---|---|
| Live validation, character counters, formatting-as-you-type, conditional UI based on current value | Controlled |
| Simple form, only care about final values on submit, want to minimize re-renders | Uncontrolled (or a form library using uncontrolled internals - see Section 3) |
| Large forms with many fields, performance-sensitive | Often uncontrolled (or React Hook Form, which uses uncontrolled/ref-based inputs under the hood specifically to avoid per-keystroke re-renders) |
| File inputs | Effectively always uncontrolled - `<input type="file">`'s `value` can't be set programmatically by React for security reasons; read `e.target.files` |

### The "controlled/uncontrolled" React warning - what causes it and how to fix it

```
Warning: A component is changing an uncontrolled input to be controlled...
```

This happens when an input's `value` prop switches between `undefined` (uncontrolled) and a defined value (controlled) across renders - most commonly when initial state is `undefined`/`null` instead of `''` before data loads.

```jsx
// BUG: `value` starts as `undefined` (uncontrolled) then becomes a string once `user` loads (controlled) - triggers the warning.
function Bad({ user }) {
  const [name, setName] = useState(user?.name);   // undefined until `user` is loaded
  return <input value={name} onChange={e => setName(e.target.value)} />;
}

// FIX: always initialize to a defined value so the input is controlled from the very first render.
function Good({ user }) {
  const [name, setName] = useState(user?.name ?? '');
  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

### Interview question

**Q: What causes the "changing an uncontrolled input to controlled" warning, and how do you fix it?**

> "It happens when an input's `value` prop is `undefined` on an earlier render and becomes a defined value later - React treats a `value` of `undefined` as 'this is an uncontrolled input, I won't manage it,' so switching to a real value mid-lifecycle is an unsupported transition. The usual cause is initializing state from data that hasn't loaded yet, like `useState(user?.name)` before `user` exists. The fix is initializing state to a defined default - `useState(user?.name ?? '')` - so the input is controlled from the first render onward."

---
