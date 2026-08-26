# Controlled vs Uncontrolled Inputs — Answers

## Core recall

1. React state drives what’s shown via `value` (+ `onChange` to update it).  
2. DOM owns the value; React reads via ref/FormData; typically `defaultValue`, not controlled `value`.  
3. `defaultValue` (or `defaultChecked`).  
4. `onChange` → setState → re-render → DOM `value` matches state.  
5. Live validation/UI derived from the current value, programmatic set/reset, formatting as you type.  
6. Submit-focused simple forms, minimize per-keystroke re-renders, large forms / RHF-style.  
7. Browser security — can’t set file `value` from script to arbitrary paths; read `files` from events/refs.  
8. `undefined` (missing/undefined `value` prop).

## Explain why

1. Otherwise React keeps forcing the old `value` — keystrokes appear ignored.  
2. Each keystroke re-renders the owner and children unless isolated — expensive trees amplify cost.  
3. First render `value={undefined}` → uncontrolled; later string → controlled switch → warning.  
4. Ensures a defined string from render 1 → always controlled.  
5. Security restriction against scripts reading/setting arbitrary local file paths.  
6. They select opposite ownership models — unclear and often buggy.

## Compare and contrast

1. **Controlled:** React owns. **Uncontrolled:** DOM owns until read.  
2. **`value`:** ongoing control. **`defaultValue`:** initial only.  
3. **Ref/FormData:** read occasionally. **State:** every change in React.  
4. RHF typically keeps field values out of React render state (refs) for perf; fully controlled is more re-renders.  
5. Direct `user.name` while null → undefined value risk; local `''` state stays controlled.

## Predict the output / behavior

1. **No** (effectively read-only / frozen) — controlled without updater.  
2. **Yes** — undefined → defined transition.  
3. **No** — not from the input alone.  
4. **Yes** — always defined `value`; effect hydration updates string content.

## Debugging

1. `useState(user?.email ?? '')` (+ hydrate via effect/key if needed).  
2. Controlled without `onChange` (or not calling setState).  
3. Remount with `key`, or set `ref.current.value = ''`, or switch to controlled reset via state.  
4. Uncontrolled then controlled warning; possibly flaky display until fixed.

## Application

1.
```jsx
const [phone, setPhone] = useState('');
<input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
```

2.
```jsx
<form onSubmit={(e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log(data.get('username'), data.get('password'));
}}>
  <input name="username" defaultValue="" />
  <input name="password" type="password" defaultValue="" />
  <button type="submit">Log in</button>
</form>
```

3. Init with `?? ''` as in notes.  
4. Paraphrase preserved interview answer.

## Interview questions

1. **Spoken:** `value` goes from `undefined` to defined (or reverse). Fix: always pass a defined value (`''`). Prefer controlled for live UI; uncontrolled for submit-only/perf; files uncontrolled + `files` API.  
2. **Spoken:** Avoid re-rendering the whole form tree every keystroke; read values on submit or via lib refs.  
3. **Spoken:** Remount (`key`), or imperatively clear DOM via ref; controlled reset is just `setState`.  
4. **Spoken:** Yes — for logging/analytics or syncing elsewhere; without driving `value` it stays uncontrolled.

## Connections

1. Controlled = React state is the truth for that field; uncontrolled = DOM is until you read.  
2. Per-keystroke renders are exactly when memo/isolation/RHF matter in large UIs.  
3. Ref holds the DOM node so you can read `.value` without state.  
4. Uncontrolled fields avoid React render on each keystroke — that’s the perf pitch.
