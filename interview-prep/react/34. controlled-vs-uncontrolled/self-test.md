# Controlled vs Uncontrolled Inputs — Self-test

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
