# Controlled vs Uncontrolled Inputs

## What you need to know

In React, an input is **controlled** when its displayed value is driven by **React state** (`value` + `onChange`). It is **uncontrolled** when the **DOM** owns the value and React reads it only when needed (`ref` / `FormData`), usually with `defaultValue` instead of `value`.

Pick based on whether you need **live** React-driven UI from the field. Mixing modes across renders causes the famous warning.

Prerequisites: [useState](../11.%20usestate/notes.md), [useRef](../15.%20useref/notes.md). Form libraries (React Hook Form) often use uncontrolled internals for performance — covered later in this chapter.

---

## Controlled inputs (preserved)

```jsx
function ControlledInput() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

Flow every keystroke:

```text
keypress → onChange → setState → re-render → value={state} written to DOM
```

React state is the **single source of truth**. The DOM value is forced to match state on each commit.

**Pros**

- Live validate / format / transform  
- Easy reset / set from code (`setValue('')`)  
- Derive UI (char count, preview, disable submit) from the same state  

**Cons**

- Re-render on every keystroke (and subtree unless isolated) — costly for huge forms + expensive parents  

**Checklist:** if you pass `value`, you **must** update it via `onChange` (or the input appears frozen).

---

## Uncontrolled inputs (preserved)

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

Flow:

```text
keypress → DOM updates itself → React may not re-render
submit → read ref.current.value (or FormData)
```

Use **`defaultValue`** (or `defaultChecked`) for the initial DOM value — not `value` (that would control it).

**Pros**

- No re-render per keystroke  
- Simple submit-only forms; native `FormData` / HTML validation attributes feel natural  

**Cons**

- Harder live validation / conditional UI from the value  
- Harder to drive the field from React after mount (you *can* set `ref.current.value`, but you’re fighting the model)  

Also common: read via `new FormData(e.target)` on submit without refs per field.

---

## Decision table (preserved)

| Need | Choice |
| --- | --- |
| Live validation, counters, format-as-you-type, conditional UI from current value | **Controlled** |
| Simple form, care about values on submit, minimize re-renders | **Uncontrolled** (or RHF-style uncontrolled) |
| Large forms, performance-sensitive | Often **uncontrolled** / React Hook Form (refs under the hood) |
| File inputs | Effectively always **uncontrolled** — can’t set `value` for security; use `onChange` → `e.target.files` or ref |

Hybrid forms are normal: controlled search box in a toolbar + uncontrolled bulk fields elsewhere.

---

## `value` vs `defaultValue` vs omitting both

| Prop | Meaning |
| --- | --- |
| `value={x}` where `x` is a string | **Controlled** (keep `x` defined — prefer `''` over `undefined`) |
| `defaultValue={x}` | **Uncontrolled** initial value |
| neither | Uncontrolled, starts empty |
| `value={undefined}` | Treated as uncontrolled — **danger** when it later becomes a string |

For checkboxes: `checked` / `defaultChecked` play the same roles.

---

## The controlled ↔ uncontrolled warning (preserved)

```
Warning: A component is changing an uncontrolled input to be controlled...
```

(or the reverse)

**Cause:** `value` is `undefined` (uncontrolled) on one render, then a defined string/number (controlled) later — or you flip the other way.

Most common: init from async data:

```jsx
// BUG
function Bad({ user }) {
  const [name, setName] = useState(user?.name); // undefined until user loads
  return <input value={name} onChange={(e) => setName(e.target.value)} />;
}

// FIX — controlled from first paint
function Good({ user }) {
  const [name, setName] = useState(user?.name ?? '');
  return <input value={name} onChange={(e) => setName(e.target.value)} />;
}
```

If `user` arrives later and you need to hydrate fields, either:

- Keep controlled with `''` and `useEffect` to `setName(user.name)` when `user` loads, or  
- Key the form (`key={user.id}`) to remount with fresh initial state when identity changes  

Don’t pass `value={user?.name}` directly without a fallback while loading.

---

## File inputs

```jsx
function AvatarUpload({ onFile }) {
  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
    />
  );
}
```

You cannot do `value={file}` to clear/set for security. To reset, remount with `key` or set `inputRef.current.value = ''` in an uncontrolled way.

---

## Interview answer (preserved)

**Q: What causes the "changing an uncontrolled input to controlled" warning, and how do you fix it?**

> “It happens when an input’s `value` prop is `undefined` on an earlier render and becomes a defined value later — React treats a `value` of `undefined` as ‘this is an uncontrolled input, I won’t manage it,’ so switching to a real value mid-lifecycle is an unsupported transition. The usual cause is initializing state from data that hasn’t loaded yet, like `useState(user?.name)` before `user` exists. The fix is initializing state to a defined default — `useState(user?.name ?? '')` — so the input is controlled from the first render onward.”

---

## Common mistakes and misconceptions

1. `value` without `onChange` → frozen input.  
2. `value={maybeUndefined}` while loading → warning.  
3. Using `value` and `defaultValue` together.  
4. Assuming uncontrolled can’t use `onChange` (it can — for side effects — without driving `value`).  
5. Trying to control `<input type="file" value={...}>`.  
6. Giant controlled form re-rendering expensive trees every keystroke — isolate state or use RHF/uncontrolled.  
7. Setting state from props only in `useState(init)` and expecting updates when props change (init runs once) — separate hydration issue.

---

## Connections to other concepts

```
controlled
  → React state is source of truth
  → re-render per keystroke
  → live UI / validation

uncontrolled
  → DOM is source of truth
  → read on submit via ref / FormData
  → defaultValue

undefined value
  → React treats as uncontrolled
  → later string → warning

React Hook Form
  → uncontrolled/refs to avoid per-keystroke renders
```

---

## Interview perspective

Be ready to:

1. Define controlled vs uncontrolled with code shapes.  
2. Decision table (live UI vs submit-only / perf).  
3. Explain and fix the warning.  
4. File input exception.  
5. Why RHF leans uncontrolled (perf) without deep-diving yet.

---

# Self-test

## Core recall

1. What makes an input controlled?
2. What makes an input uncontrolled?
3. What prop sets the initial value of an uncontrolled input?
4. What happens on each keystroke in a controlled input?
5. When should you prefer controlled?
6. When should you prefer uncontrolled?
7. Why are file inputs effectively uncontrolled?
8. What `value` value makes React treat the input as uncontrolled?

## Explain why

1. Why must a controlled input update state in `onChange`?
2. Why can large controlled forms hurt performance?
3. Why does `useState(user?.name)` often cause the warning?
4. Why is `?? ''` a fix for that pattern?
5. Why can’t you programmatically set a file input’s `value` to a path string?
6. Why is mixing `value` and `defaultValue` a smell?

## Compare and contrast

1. Controlled vs uncontrolled  
2. `value` vs `defaultValue`  
3. Reading via `ref` vs keeping state every keystroke  
4. Controlled form vs React Hook Form’s typical approach (high level)  
5. Spinner while `user` loads + `value={user.name}` vs `value={name}` with `''` init  

## Predict the output / behavior

1. `<input value="hi" />` with no onChange — can the user type?  
2. State `undefined`, then `setState('a')` with `value={state}` — warning?  
3. Uncontrolled input with `defaultValue="x"` — does parent re-render each keystroke by default?  
4. `useState('')` then later `setName(user.name)` when user loads — controlled throughout?

## Debugging

1. Warning: uncontrolled to controlled; state init `user?.email`. Fix?  
2. Input won’t accept typing; `value={form.name}` but forgot onChange. Diagnose.  
3. Cleared form still shows old text in uncontrolled fields after “reset” only cleared React state you weren’t using. Fix approach?  
4. `value={user?.name}` while `user` is null then object — what happens?

## Application

1. Write a controlled phone field that only allows digits.  
2. Write an uncontrolled login form reading username/password on submit via FormData.  
3. Fix `Bad` from the notes to `Good`.  
4. Spoken answer for the uncontrolled→controlled warning.

## Interview questions

1. What causes the "changing an uncontrolled input to controlled" warning, and how do you fix it?  
   - Follow-up: Controlled vs uncontrolled — when each?  
   - Follow-up: File inputs?
2. Why might you choose uncontrolled inputs for a large form?  
3. How do you reset an uncontrolled input?  
4. Can you use `onChange` on an uncontrolled input? Why?

## Connections

1. How does this relate to “single source of truth”?
2. How do re-renders per keystroke connect to performance chapter themes?
3. How does `useRef` enable the uncontrolled submit pattern?
4. Why do form libraries mention uncontrolled internals in the same breath as performance?
