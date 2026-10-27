# React 06 — Forms & Accessibility (REACT-251–REACT-300)

React 18+ (React 19 form actions noted where relevant). Compact handbook format.

---

### REACT-251 — Controlled vs uncontrolled inputs
**Difficulty:** Junior
**Category:** Forms
**Question:** What is the difference between a controlled and an uncontrolled input in React? When would you pick each?
**Answer:** In a controlled input, the value lives in React state. You pass `value` and `onChange`, so React is the single source of truth. In an uncontrolled input, the DOM keeps the value, and you read it later through a ref, `FormData`, or on submit. I use controlled inputs for live validation, input masking, dependent fields, and instant feedback. Uncontrolled is simpler and cheaper for plain forms that only matter on submit, and it's the only option for file inputs. Real forms often mix both.
**Follow-up:** Can an input switch between the two?

Answer: It can, but React warns. If `value` goes from `undefined` to a real value, the mode flips and causes bugs. So always give controlled inputs a starting value, like an empty string.

### REACT-252 — `value` vs `defaultValue`
**Difficulty:** Junior
**Category:** Forms
**Question:** What does `defaultValue` do, and how does it differ from `value`?
**Answer:** `defaultValue` sets the starting value of an uncontrolled input. After that, React doesn't track changes. `value` makes the input controlled, and React sets the DOM value on every render. Changing `defaultValue` after the input has mounted does nothing. To reset an uncontrolled form to new defaults, I remount it with a `key` or call `form.reset()`. The same idea applies to `defaultChecked` for checkboxes and radio buttons.
**Code:**
```jsx
<input name="email" defaultValue={user.email} />
<input value={email} onChange={e => setEmail(e.target.value)} />
```
**Follow-up:** Why doesn't updating `defaultValue` update the field?

Answer: It's only read when the input mounts, like the HTML `value` attribute versus the live value. Use `key={user.id}` to remount when the source record changes.

### REACT-253 — "value without onChange" warning
**Difficulty:** Junior
**Category:** Forms
**Question:** Why does React warn when you pass `value` without `onChange`, and how do you fix it?
**Answer:** A controlled input without a change handler becomes read-only. When you type, React re-renders with the same value, so your typing is ignored. The warning points out a likely bug. To fix it, I add an `onChange` that updates state, or I use `defaultValue` if I want an uncontrolled input, or I add `readOnly` if the field really shouldn't be editable. I wouldn't silence the warning with an empty handler unless I truly want a locked field.
**Follow-up:** Difference between `readOnly` and `disabled`?

Answer: A `readOnly` field can be focused and is submitted with the form. A `disabled` field can't be focused and isn't submitted.

### REACT-254 — Cursor jumping in controlled inputs
**Difficulty:** Intermediate
**Category:** Forms
**Question:** A controlled text input's caret jumps to the end while typing. What typically causes this?
**Answer:** It happens when the value React renders differs from what the user just typed. Two common causes are transforming the input, like formatting, trimming, or uppercasing it, and updating state asynchronously, such as after an `await` or a debounce. React then resets the DOM value, and the caret moves. The fix is to update state right away with exactly what the input contains, and compute the formatted display separately. Alternatively, restore `selectionStart` manually in a layout effect. Debounce side effects, not the field's own state.
**Follow-up:** How do you debounce validation safely?

Answer: Keep the raw input state updating immediately, and debounce a derived value or the validation call. Never debounce the `value` itself.

### REACT-255 — Reading uncontrolled inputs
**Difficulty:** Junior
**Category:** Forms
**Question:** How can you read values from an uncontrolled form, and what are the options?
**Answer:** There are three main options. You can use a ref per input and read `ref.current.value`. You can use `new FormData(form)` on submit, which is best for many fields, since values are keyed by `name`. Or you can use `event.currentTarget.elements`. `FormData` scales well and works with native validation. Refs are better for imperative needs, like focusing a field. I avoid `document.querySelector` inside React components.
**Code:**
```jsx
function onSubmit(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
}
```
**Follow-up:** What does `FormData` skip?

Answer: Disabled fields, unchecked checkboxes and radio buttons, and inputs that have no `name`.

### REACT-256 — Handling many fields
**Difficulty:** Junior
**Category:** Forms
**Question:** How do you manage a form with many controlled fields without writing a handler per field?
**Answer:** I store all values in one object and use a shared `onChange` handler. It reads `name` and `value` from the event and updates that key using a functional state update. For checkboxes, it reads `checked` instead. If the form gets complex, with arrays, nesting, or heavy validation, I move to a form library or `useReducer`. One caveat is that with this pattern every keystroke re-renders the whole form.
**Code:**
```jsx
const onChange = e => {
  const { name, value, type, checked } = e.target;
  setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
};
```
**Follow-up:** What's the render-performance downside?

Answer: Each keystroke re-renders the parent and all its children. You can fix it by splitting components, memoizing, or using a library based on uncontrolled inputs, like React Hook Form.

### REACT-257 — Checkbox, radio, and select
**Difficulty:** Junior
**Category:** Forms
**Question:** How do controlled checkboxes, radios, and selects differ from text inputs?
**Answer:** A checkbox uses `checked` instead of `value`, and you read `e.target.checked`. Radio buttons in a group share a `name`, and each one has `checked={selected === option}`. In React, a `<select>` takes `value` on the `<select>` itself, not `selected` on each option, and `multiple` needs an array. For all of them, I render real `<label>` elements, so the click target is larger and screen readers can announce each control properly.
**Follow-up:** Why `value` on `<select>` instead of `selected` on `<option>`?

Answer: React makes it consistent, so every form control uses the same controlled API.

### REACT-258 — Why use a form library
**Difficulty:** Intermediate
**Category:** Form libraries
**Question:** When is hand-rolled state enough for forms, and when should you reach for a form library?
**Answer:** Hand-written state is fine for a form with one to five fields and simple rules. A library pays off when you need per-field touched, dirty, and error state, schema validation, nested or dynamic arrays, async validation, good performance on large forms, or consistent submit handling. The costs are an extra dependency, a learning curve, and sometimes awkward integration with custom UI components.
**Trade-offs:** Less boilerplate and better perf vs. abstraction, bundle size, and library lock-in.
**Follow-up:** What's the third option besides library or manual state?

Answer: Use a native `<form>` with `FormData`, server actions, and the browser's built-in validation. For simple flows, that is often enough.

### REACT-259 — React Hook Form vs Formik
**Difficulty:** Intermediate
**Category:** Form libraries
**Question:** At a high level, how do React Hook Form and Formik differ, and which would you choose?
**Answer:** React Hook Form is uncontrolled-first. It registers inputs through refs, so typing doesn't re-render the whole form, which gives better performance and a small bundle. Formik is controlled-first. It's easy to reason about because everything is driven by state, but it re-renders more and has seen slower maintenance. Both support schema validation with Zod or Yup. I'd choose React Hook Form for new projects, and keep Formik where it's already used.
**Trade-offs:** RHF: perf, ecosystem momentum; needs `Controller` for controlled UI libs. Formik: familiar API; more re-renders.
**Follow-up:** When do you need RHF's `Controller`?

Answer: When wrapping third-party controlled components, like custom selects or date pickers, that don't expose a native input ref.

### REACT-260 — Validation timing UX
**Difficulty:** Intermediate
**Category:** Validation UX
**Question:** When should validation errors appear: onChange, onBlur, or onSubmit?
**Answer:** Showing an error while the user is still typing, like "invalid email" after one character, is frustrating. A common pattern is to validate on blur for first-time feedback, then re-validate on every change once the field has shown an error. People call this "reward early, punish late." I always validate on submit and focus the first invalid field. Some checks, like password strength or character count, are helpful live. I match the timing to the field and the user's intent.
**Follow-up:** What's RHF's `mode` option?

Answer: It sets when validation first runs: `onSubmit`, `onBlur`, `onChange`, or `onTouched`. `reValidateMode` controls when it runs again after the first submit.

### REACT-261 — Schema validation with shared schemas
**Difficulty:** Intermediate
**Category:** Validation
**Question:** Why use a schema library like Zod for form validation, and how does it fit client and server?
**Answer:** A schema describes the shape and rules of the data in one place. It gives you type inference and consistent error messages. The same schema can run in the browser for a better user experience and on the server for real enforcement, so the two never drift apart. Form libraries connect to it through resolvers. I keep UI-specific messages easy to map, and I never assume client-side validation is trustworthy.
**Code:**
```ts
const Schema = z.object({ email: z.string().email(), age: z.coerce.number().min(18) });
const result = Schema.safeParse(Object.fromEntries(formData));
```
**Follow-up:** Why `z.coerce` for form values?

Answer: Form values arrive as strings, so numbers and dates must be converted before validation.

### REACT-262 — Never trust client validation
**Difficulty:** Junior
**Category:** Validation
**Question:** If the client validates a form, why must the server validate again?
**Answer:** Client checks only improve the user experience. Anyone can bypass them with curl, browser devtools, or a modified client. The server must enforce authentication, authorization, types, ranges, and business rules, and return structured field errors that the UI can display. Some checks can only be done on the server anyway, like whether an email is already taken, because they depend on current data and concurrent requests.
**Follow-up:** How do you display server field errors?

Answer: Return an error map keyed by field name and render each message next to its input. With a form library, you can set them directly, for example with RHF's `setError`.

### REACT-263 — Native form + FormData
**Difficulty:** Intermediate
**Category:** Native forms
**Question:** Why might you prefer a plain `<form>` and `FormData` over controlled state in React 18+?
**Answer:** Native forms give you a lot for free: Enter to submit, built-in validation like `required`, `type`, and `pattern`, browser autofill, `reset`, and progressive enhancement. With uncontrolled inputs, you avoid a re-render on each keystroke and a lot of state wiring. I add React state only where I need live UI, such as previews or conditional fields. It's often less code, and often more accessible too.
**Follow-up:** How do you trigger native validation UI manually?

Answer: Call `form.reportValidity()` or `checkValidity()`, or just submit and let the browser block invalid submissions. Don't add `noValidate` unless you handle errors yourself.

### REACT-264 — `<form action={fn}>` in React 19
**Difficulty:** Intermediate
**Category:** Actions
**Question:** What does passing a function to `<form action>` do in React 19?
**Answer:** When the form is submitted, React calls your function with the form's `FormData`, runs it inside a transition, and resets uncontrolled fields after the action succeeds. The function can be async on the client, or a server function in frameworks that support Server Components. This gives you pending-state tracking and progressive enhancement with server functions. You no longer need `preventDefault` or to build `FormData` yourself.
**Code:**
```jsx
async function save(formData) { await api.save(formData.get('name')); }
<form action={save}><input name="name" /><button>Save</button></form>
```
**Follow-up:** What happens to inputs after the action?

Answer: React resets uncontrolled fields automatically. Controlled inputs keep their state.

### REACT-265 — `useActionState`
**Difficulty:** Intermediate
**Category:** Actions
**Question:** What is `useActionState` and what problem does it solve?
**Answer:** `useActionState` returns `[state, formAction, isPending]`. You give it an action with the shape `(prevState, formData) => newState`. The action can return validation errors or a result, and you render that state directly, without separate `useState` code. You also get a pending flag. You pass `formAction` to `<form action>`. It replaces the earlier name `useFormState`, which existed in canary builds and in `react-dom`.
**Code:**
```jsx
const [state, action, pending] = useActionState(submit, { errors: {} });
<form action={action}>…{state.errors.email}</form>
```
**Follow-up:** Where does `prevState` come from?

Answer: React passes in the last state your action returned, or the initial state on the first call. That makes sequential or accumulating results possible.

### REACT-266 — `useFormStatus`
**Difficulty:** Intermediate
**Category:** Actions
**Question:** What does `useFormStatus` provide and what is its main constraint?
**Answer:** It returns `{ pending, data, method, action }` for the submission of the parent `<form>`. It's ideal for a reusable `SubmitButton` that disables itself while the form is submitting. The main constraint is that you must call it from a component rendered inside the form, not from the component that renders the `<form>` itself. It's imported from `react-dom`.
**Code:**
```jsx
function Submit() { const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>; }
```
**Follow-up:** Why doesn't it work in the same component as `<form>`?

Answer: It reads the status of the nearest parent form, so the component calling it must be a descendant of that form.

### REACT-267 — Optimistic UI with forms
**Difficulty:** Senior
**Category:** Actions
**Question:** How does `useOptimistic` fit with form actions, and what are the risks?
**Answer:** `useOptimistic(state, reducer)` lets you show the expected result right away while the action is still pending. When the action finishes, React goes back to the real state. Combined with a form action, you can instantly add a comment or toggle a like. The risk is showing success for something that later fails. So I show errors clearly, keep updates safe to repeat, and avoid it for irreversible or high-stakes actions like payments.
**Follow-up:** What happens on failure?

Answer: The optimistic value is dropped when the transition ends, and the UI falls back to the real state. You should also show an error message.

### REACT-268 — Preventing double submit
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you prevent users from submitting a form twice?
**Answer:** On the client, I track the pending state, using `useFormStatus`, `isPending`, or `isSubmitting`, and disable the button. Disabling alone is fragile, because of the Enter key and slow state updates, so I also return early in the submit handler. On the server, I use idempotency keys or unique constraints, because retries, page refreshes, and multiple tabs can still create duplicates. I also keep the pending button accessible, for example with `aria-disabled`.
**Follow-up:** Why isn't disabling the button enough?

Answer: Pressing Enter or double-clicking quickly can fire before the disabled state renders. And it does nothing against network retries.

### REACT-269 — File inputs
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you handle `<input type="file">` in React, and why can't it be controlled?
**Answer:** Browsers don't allow code to set a file input's value, for security reasons, so it's always uncontrolled. In `onChange`, I read `e.target.files`, which is a `FileList`, or I use `FormData`. I check file type and size on the client for a better experience, but I validate again on the server. For uploads, I'd consider signed URLs to upload directly to storage, progress tracking, and the `accept` and `multiple` attributes.
**Code:**
```jsx
<input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
```
**Follow-up:** How can you clear a file input?

Answer: Set `ref.current.value = ''`, which is allowed for clearing, or remount the input by changing its `key`.

### REACT-270 — File previews and object URLs
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you show an image preview for a selected file and avoid memory leaks?
**Answer:** I use `URL.createObjectURL(file)` to get a preview URL for the image's `src`. Then I release it with `URL.revokeObjectURL` when the file changes or the component unmounts, usually in an effect cleanup. `FileReader.readAsDataURL` also works, but it's heavier. I create the URL from the `file` state inside an effect, not during render, because creating it in render would leak a new URL on every render.
**Code:**
```jsx
useEffect(() => { if (!file) return;
  const url = URL.createObjectURL(file); setPreview(url);
  return () => URL.revokeObjectURL(url); }, [file]);
```
**Follow-up:** Why not create the URL in render?

Answer: Render should be pure. It would create a new blob URL on every render and never free it.

### REACT-271 — Multi-step form state
**Difficulty:** Senior
**Category:** Multi-step forms
**Question:** How would you design state for a multi-step (wizard) form?
**Answer:** I keep one source of truth for all steps' data. That can be a parent component, a reducer with context, a form library's `FormProvider`, or the URL or a server-side draft. Each step validates its own part before moving on, and the final submit validates the whole schema. I persist progress, using a URL step parameter, sessionStorage, or a server draft, so refresh and the back button work. The state must live above the step components, so it isn't lost when a step unmounts.
**Trade-offs:** One big form = simple submit but heavy; per-step forms = isolated validation but more merge logic.
**Follow-up:** Where should the current step live?

Answer: In the URL, such as `?step=2`, when you want deep links and back and forward support. Otherwise, local state is fine.

### REACT-272 — Resetting forms with `key`
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you reset a form's state when the record being edited changes?
**Answer:** I give the form, or its container, a `key` equal to the record's id. When the key changes, React remounts the form with fresh state and fresh `defaultValue`s. That avoids copying props into state with effects, which is error-prone. For an explicit reset button, I call `form.reset()` on uncontrolled forms, or set the state or library values again, for example with `reset(values)` in React Hook Form.
**Code:**
```jsx
<EditForm key={user.id} initial={user} />
```
**Follow-up:** Why avoid `useEffect` to copy props into state?

Answer: It causes an extra render with stale values and subtle bugs. A remount driven by a key is simpler and correct.

### REACT-273 — Unsaved changes warning
**Difficulty:** Senior
**Category:** Forms
**Question:** How do you warn users about losing unsaved form changes?
**Answer:** First, I track whether the form is dirty, using the form library's `isDirty` or by comparing to the initial values. While it's dirty, I add a `beforeunload` listener to cover closing the tab or refreshing. For navigation inside the app, I use the router's blocker, like `useBlocker` in React Router. I remove the listeners when the form is clean or saved. Browsers only show a generic message. Where possible, I prefer autosave or drafts, since warnings add friction.
**Follow-up:** Why not just always confirm?

Answer: Constant prompts teach users to dismiss them. Only block navigation when there is real unsaved data.

### REACT-274 — Labels and `useId`
**Difficulty:** Junior
**Category:** Accessibility
**Question:** How do you correctly associate labels with inputs in React, and why use `useId`?
**Answer:** I use `<label htmlFor={id}>` with a matching `id` on the input, or I wrap the input inside the label. The label gives the control its accessible name and makes the click target bigger. `useId` generates unique ids that are stable between server and client, so reusable components don't collide or cause hydration mismatches. I never generate ids with `Math.random()`.
**Code:**
```jsx
const id = useId();
<label htmlFor={id}>Email</label><input id={id} type="email" />
```
**Follow-up:** Can I use `useId` output for CSS selectors?

Answer: Not reliably, because it contains colons. Use it for ids and ARIA references, and use classes for styling.

### REACT-275 — Placeholder is not a label
**Difficulty:** Junior
**Category:** Accessibility
**Question:** Why shouldn't a placeholder replace a visible label?
**Answer:** A placeholder disappears when the user starts typing, so they have to remember what the field was for. Placeholders usually have low contrast, and assistive technology doesn't reliably treat them as the field's name. People with cognitive disabilities are affected most. I use a persistent, visible label, and use the placeholder only for an example format. If the design uses floating labels, I still keep a real `<label>` element.
**Follow-up:** When is a visually hidden label acceptable?

Answer: When the surrounding context makes the purpose obvious, like a search box next to a search button. Keep the label in the DOM so screen readers can still announce it.

### REACT-276 — `aria-label`, `aria-labelledby`, `aria-describedby`
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** What are the differences between `aria-label`, `aria-labelledby`, and `aria-describedby`?
**Answer:** `aria-label` gives an element a name directly as a text string. `aria-labelledby` points to the ids of other elements whose text becomes the name, which I prefer when visible text already exists. `aria-describedby` points to extra information, like hints or errors, that is read after the name. A name says what the control is, and a description gives extra help. I try native labels and visible text first, and treat ARIA as a fallback.
**Follow-up:** Which wins if multiple naming sources exist?

Answer: `aria-labelledby` wins over `aria-label`, which wins over native labels, when the browser works out the accessible name.

### REACT-277 — Accessible field errors
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** How do you make a field's validation error accessible?
**Answer:** I show the error text next to the field, connect it with `aria-describedby`, and set `aria-invalid="true"` while the field is invalid. I don't rely on color or an icon alone. The message should say something specific, like "Email must include @". I also make sure that hiding the error element when there's no error doesn't break the id reference the input points to.
**Code:**
```jsx
<input id="e" aria-invalid={!!err} aria-describedby={err ? 'e-err' : undefined} />
{err && <p id="e-err">{err}</p>}
```
**Follow-up:** Does `aria-invalid` replace error text?

Answer: No. It only signals that something is wrong. The message text is what tells the user how to fix it.

### REACT-278 — Announcing errors
**Difficulty:** Senior
**Category:** Accessibility
**Question:** How should form submit errors be announced to screen reader users?
**Answer:** One option is to move focus to the first invalid field, so its error is read out. Another is to move focus to an error summary heading with links to each field. A third is to announce a summary through a live region, using `role="alert"` or `aria-live`. I avoid announcing an error on every keystroke, and I avoid moving focus and also firing a duplicate alert. Behavior varies between screen readers, so I test with real ones.
**Trade-offs:** Focus move is reliable and navigable; live regions are non-disruptive but can be missed or double-read.
**Follow-up:** Why an error summary with links?

Answer: It lists all the problems in one place, and lets keyboard users jump straight to each failing field.

### REACT-279 — Live regions: polite vs assertive
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** How do `aria-live` regions work, and when use `polite` vs `assertive`?
**Answer:** A live region makes a screen reader announce content changes without moving focus. `polite` waits until the user pauses, which suits status messages like "Saved" or a results count. `assertive` interrupts, so it's for critical errors. The roles `status` and `alert` imply these two behaviors. The region has to exist in the DOM before its content changes, so I always render the container and only update its text. Overusing live regions gets noisy.
**Code:**
```jsx
<div role="status" aria-live="polite">{saved ? 'Changes saved' : ''}</div>
```
**Follow-up:** Why might an announcement not be read?

Answer: The live region was added to the page at the same time as its text. Assistive technology never saw a change, so nothing was announced.

### REACT-280 — Focus first invalid field
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** After a failed submit, why and how do you move focus to the first invalid field?
**Answer:** Without it, keyboard and screen reader users may not realize the submit failed, or where to fix it. I collect refs, or query `[aria-invalid="true"]`, and call `.focus()` after the errors have rendered, in an effect. Form libraries do this too, for example `shouldFocusError` in React Hook Form. I also make sure the error is visible, and scroll it into view if a sticky header would cover it.
**Follow-up:** Why call focus in an effect?

Answer: The error markup and `aria-invalid` must be in the DOM first. Effects run after the DOM is updated.

### REACT-281 — Semantic HTML over div soup
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** Why use semantic HTML elements instead of styled `div`s?
**Answer:** Native elements come with roles, keyboard behavior, focus handling, and form integration built in. Examples are `button`, `a`, `nav`, `main`, `ul`, `table`, and `dialog`. With a `div`, you have to rebuild all that with ARIA, `tabindex`, and key handlers, and it's usually not quite right. Semantic elements also help SEO, reader modes, and tests that use `getByRole`. The first rule of ARIA is: if a native element does the job, don't use ARIA.
**Follow-up:** Can you give a quick example of the cost?

Answer: A `div onClick` can't be focused, ignores Enter and Space, and has no role. A `<button>` gives you all three.

### REACT-282 — Button vs clickable div
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** What do you lose with `<div onClick>` compared to `<button>`, and when is `<a>` correct?
**Answer:** With a `div`, you lose keyboard focus, activation with Enter and Space, the role announcement, disabled behavior, and form submit behavior. I use `<button>` for actions, where something happens, and `<a href>` for navigation, where you go somewhere. Links also support middle-click and "open in new tab." I set `type="button"` to avoid accidental form submits. If I must use a div, I add a `role`, `tabIndex=0`, and key handlers, which is rarely worth it.
**Follow-up:** Why `type="button"`?

Answer: A button inside a form defaults to `type="submit"`, which would submit the form unexpectedly.

### REACT-283 — Heading hierarchy
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** Why does heading order matter, and how do you keep it correct in a component-based app?
**Answer:** Screen reader users often navigate by headings, so the levels, h1 then h2 then h3, should reflect the page outline and not skip levels just for styling. One `h1` per page is the practical convention. In reusable components, I don't hardcode the level. I accept a `level` prop or derive it from context, and I control the visual size with CSS classes. I check the result with an outline tool or axe.
**Follow-up:** Can headings be chosen by size?

Answer: No. Choose the level by structure, and use CSS for the visual size.

### REACT-284 — Landmarks
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** What are landmark regions and why use them?
**Answer:** Landmarks, such as `header`, `nav`, `main`, `aside`, `footer`, and named `section` or `form` elements, let assistive technology users jump between areas of the page. I use one `main`, and I label multiple `nav` elements with `aria-label`, like "Primary" and "Footer," so they can be told apart. I don't wrap everything in landmarks, because too many make navigation less useful.
**Follow-up:** When does `section` become a landmark?

Answer: Only when it has an accessible name, for example through `aria-labelledby`. Otherwise it's just a generic grouping.

### REACT-285 — Skip links
**Difficulty:** Junior
**Category:** Keyboard
**Question:** What is a skip link and how do you implement it in a React app?
**Answer:** A skip link is the first focusable element on the page. It lets keyboard users jump past the repeated navigation straight to the `main` content. I implement it as `<a href="#main">Skip to content</a>`, with a target element that has `id="main"` and `tabIndex={-1}`, so focus actually moves there. I hide it visually until it receives focus, without using `display:none`. In a single-page app, I also make sure client-side routing doesn't break the hash target.
**Code:**
```jsx
<a className="skip" href="#main">Skip to content</a>
<main id="main" tabIndex={-1}>…</main>
```
**Follow-up:** Why not `display:none`?

Answer: Hidden elements can't be focused or exposed to assistive tech. Use an offscreen or clipping technique that reveals the link on `:focus`.

### REACT-286 — Keyboard navigation and `tabIndex`
**Difficulty:** Intermediate
**Category:** Keyboard
**Question:** How should `tabIndex` be used, and what are the pitfalls of positive values?
**Answer:** `tabIndex={0}` puts an element into the natural tab order. `tabIndex={-1}` makes it focusable only through code, which is useful for focus management targets. Positive values override the DOM order and create confusing, hard-to-maintain tab sequences, so I avoid them. I keep the DOM order matching the visual order and prefer native interactive elements. I also keep a visible `:focus-visible` style, and never remove outlines without a replacement.
**Follow-up:** Why can CSS reordering hurt accessibility?

Answer: The visual order can differ from the DOM and tab order, so focus jumps around unpredictably.

### REACT-287 — Roving tabindex
**Difficulty:** Senior
**Category:** Keyboard
**Question:** What is the roving tabindex pattern, and when do you use it in React?
**Answer:** It's for widgets with several related items, like tabs, toolbars, menus, or radio-like lists. Only one item has `tabIndex={0}`, and the rest have `-1`. Arrow keys move focus and update which item is the "0" one. So the whole widget is a single tab stop, which matches WAI-ARIA guidance. I track the active index in state and move focus with refs. `aria-activedescendant` is an alternative. I'd rather use a headless library like Radix or React Aria than hand-roll it.
**Follow-up:** Why only one tab stop?

Answer: It keeps tabbing through the page fast. The arrow keys handle movement inside the widget.

### REACT-288 — Focus on route change
**Difficulty:** Senior
**Category:** Focus management
**Question:** What accessibility problem do SPAs have on navigation, and how do you address it?
**Answer:** Client-side routing doesn't reload the page, so focus stays on the link that was clicked, and screen readers get no signal that the content changed. After navigation, I move focus to the new page's `h1` or to `main` with `tabIndex={-1}`, update `document.title`, and optionally announce the change through a live region. Many routers and frameworks have helpers for this, but I still verify the behavior manually.
**Follow-up:** Why update the document title?

Answer: Screen readers announce the title on a normal page load. In a single-page app, it's one of the main signals that navigation happened.

### REACT-289 — Accessible modals
**Difficulty:** Senior
**Category:** Focus management
**Question:** What must an accessible modal dialog do?
**Answer:** It must move focus into the dialog when it opens, keep Tab inside it, close on Escape, and return focus to the trigger when it closes. The background content should be inert, using `aria-modal="true"` plus `inert` or `aria-hidden` on sibling content. The dialog needs `role="dialog"` and an accessible name. I'd prefer the native `<dialog>` element with `showModal()`, which handles much of this, or a well-tested library. I render it in a portal.
**Trade-offs:** Native `<dialog>` = less code, good support; libraries = consistent styling/animation and edge-case handling.
**Follow-up:** Why restore focus?

Answer: Otherwise focus resets to the top of the document, and keyboard users have to navigate back from the start.

### REACT-290 — Dismissal: Escape and outside click
**Difficulty:** Intermediate
**Category:** Focus management
**Question:** How do you correctly implement dismissal of popovers and dialogs for keyboard and pointer users?
**Answer:** For Escape, I add a `keydown` listener and clean it up in an effect. For clicking outside, I listen for `pointerdown` on the document and check `ref.contains(event.target)`. Outside click shouldn't be the only way to close, so I always include a visible close button. Focus should return to the trigger when it closes. With nested layers, only the topmost one should close on Escape.
**Follow-up:** Why `pointerdown` over `click`?

Answer: It fires before focus or selection changes. It also avoids closing when a drag starts inside the popover and ends outside.

### REACT-291 — `disabled` vs `aria-disabled`
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** What's the difference between `disabled` and `aria-disabled`, and when use each?
**Answer:** The `disabled` attribute removes the control from the tab order, blocks events, and excludes it from form submission. `aria-disabled="true"` only tells assistive technology about the state. The element stays focusable, and you must block the action yourself. I use `aria-disabled` when users need to discover why a button is unavailable, since they can still focus it and read an explanation. I use `disabled` for truly inactive controls, and while a submit is pending.
**Follow-up:** Downside of `disabled` submit buttons for invalid forms?

Answer: Users get no feedback about what's wrong. Consider keeping the button enabled and showing errors on submit.

### REACT-292 — Color contrast as a product concern
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** Why is color contrast a product and design-system concern rather than just a dev detail?
**Answer:** WCAG AA requires a contrast ratio of 4.5 to 1 for normal text, and 3 to 1 for large text, UI components, and focus indicators. Contrast affects people with low vision, people in bright light, and legal compliance. It's cheapest to enforce in design tokens and the design system, with approved color pairs and rules for dark mode, disabled, and placeholder states, plus CI checks. Fixing it component by component after launch can mean rework on the scale of a rebrand.
**Follow-up:** Does passing automated checks guarantee good contrast?

Answer: No. Tools miss text over images or gradients, and states like hover or focus. Review those manually too.

### REACT-293 — Don't rely on color alone
**Difficulty:** Junior
**Category:** Accessibility
**Question:** Why shouldn't color be the only way to convey meaning (e.g. errors in red)?
**Answer:** Color-blind users and people on monochrome displays can miss it, and screen readers can't see color at all. I add backup cues: text like "Error:", icons with accessible names, patterns, underlines on links, and ARIA states like `aria-invalid`. For required fields, I use text or an asterisk that the form explains, not just a red border.
**Follow-up:** How do you check this quickly?

Answer: Use the grayscale or color-blindness emulation in browser devtools, and see whether the status is still obvious.

### REACT-294 — Accessible names and hiding content
**Difficulty:** Intermediate
**Category:** Screen readers
**Question:** How do `display:none`, `visibility:hidden`, `aria-hidden`, and a visually-hidden class differ for assistive tech?
**Answer:** `display:none` and `visibility:hidden` remove content from the screen and from the accessibility tree, so screen readers skip it too. `aria-hidden="true"` hides content from assistive technology but leaves it visible on screen. A visually-hidden class, often called `sr-only`, hides content visually but keeps it available to screen readers. I use `sr-only` for the text in icon buttons, and `aria-hidden` for decorative icons.
**Code:**
```jsx
<button><svg aria-hidden="true" />&nbsp;<span className="sr-only">Delete</span></button>
```
**Follow-up:** How should icon-only buttons be named?

Answer: Give them text, either through `sr-only` content or `aria-label`. Never leave a button without a name.

### REACT-295 — `aria-hidden` on focusable elements
**Difficulty:** Senior
**Category:** Screen readers
**Question:** Why is putting `aria-hidden="true"` on a container with focusable children a bug?
**Answer:** Keyboard users can still tab into elements that screen readers have been told don't exist. This creates "silent" focus stops, where focus lands somewhere and nothing is announced. When hiding offscreen content, like drawers or the background behind a modal, I also make it unfocusable using `inert`, `hidden`, or `display:none`, or by setting `tabIndex={-1}`. The `inert` attribute handles both focus and assistive technology exposure.
**Follow-up:** What does `inert` do?

Answer: It makes a whole subtree non-interactive, unfocusable, and hidden from the accessibility tree.

### REACT-296 — Custom widgets: combobox, select, tabs
**Difficulty:** Staff
**Category:** ARIA patterns
**Question:** Should you build custom comboboxes/selects/tabs yourself? How do you approach it?
**Answer:** Rarely. These widgets need exact roles and states, keyboard behavior, focus handling, and screen reader testing. A combobox, for example, needs `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant`. I prefer a native `<select>` when possible. Otherwise I use a headless library, such as React Aria, Radix, Headless UI, or Ariakit, that follows the WAI-ARIA Authoring Practices and lets me style it. If I do build one, I follow those practices exactly and test with VoiceOver or NVDA.
**Trade-offs:** Libraries cost dependency/bundle and some design constraints but remove a large class of accessibility bugs.
**Follow-up:** Why is native `<select>` often still best?

Answer: It's accessible, mobile-friendly, and works fully with the keyboard out of the box. The cost is limited styling.

### REACT-297 — `fieldset` and `legend`
**Difficulty:** Junior
**Category:** Accessibility
**Question:** When should you group controls with `<fieldset>` and `<legend>`?
**Answer:** I use them for related controls that answer one shared question, like a group of radio buttons, a group of checkboxes, or an address block. The legend becomes the group's accessible name and is announced with each control, giving context like "Shipping method: Standard". A `div role="group"` with `aria-labelledby` is an alternative. Without grouping, a radio button might be read as just "Standard, radio button," with no question attached.
**Follow-up:** Can `fieldset` be disabled as a group?

Answer: Yes. Setting `disabled` on the fieldset disables all the controls inside it.

### REACT-298 — Input types, `autocomplete`, and `inputMode`
**Difficulty:** Intermediate
**Category:** Forms
**Question:** Which native input attributes improve usability and accessibility in forms?
**Answer:** The right `type`, such as `email`, `tel`, `url`, `number`, or `date`, gives mobile users the right keyboard and built-in validation. `autocomplete` values like `email`, `given-name`, `one-time-code`, and `current-password` enable autofill, and WCAG requires them for fields about the user's identity. `inputMode="numeric"` shows a numeric keypad without the quirks of `type="number"`, which suits card numbers or one-time codes. Other useful attributes are `required`, `min`, `pattern`, and `enterKeyHint`.
**Follow-up:** Why avoid `type="number"` for IDs or card numbers?

Answer: It adds spinner buttons, drops leading zeros, and allows scroll-wheel changes. Use a text input with `inputMode="numeric"` and `pattern`.

### REACT-299 — Testing accessibility: RTL and axe
**Difficulty:** Intermediate
**Category:** Testing
**Question:** How do you test accessibility in a React codebase at a basic level?
**Answer:** I query elements by role and name with React Testing Library, like `getByRole('button', {name: /save/i})`. That naturally checks semantics and labels. I add `jest-axe`, or `@axe-core/playwright`, to catch rule violations like missing labels or incorrect ARIA. I use `userEvent` to test keyboard flows: Tab, Enter, Escape, and focus returning. Automated tools find only about a third of issues, so I add manual keyboard and screen reader checks.
**Code:**
```jsx
const { container } = render(<Form />);
expect(await axe(container)).toHaveNoViolations();
```
**Follow-up:** Why prefer `getByRole` over `getByTestId`?

Answer: It checks what users and assistive technology actually perceive, and it fails when semantics break.

### REACT-300 — Accessibility strategy for a team
**Difficulty:** Staff
**Category:** Accessibility
**Question:** How would you build accessibility into a product team's process rather than treat it as a late audit?
**Answer:** I'd move it earlier, "shift left." That means accessible design-system components and tokens covering contrast, focus, and spacing, `eslint-plugin-jsx-a11y` in linting, axe checks in unit tests, end-to-end tests, and CI, and Storybook accessibility add-ons. I'd add definition-of-done items like keyboard path, labels, and focus order, regular manual screen reader reviews, and an owner or a champions group. I'd track accessibility issues like bugs, involve users with disabilities where possible, and target WCAG 2.2 AA.
**Trade-offs:** Upfront investment and slower first delivery vs. avoiding costly retrofits, legal risk, and excluded users.
**Follow-up:** What can't automated tools find?

Answer: Logical focus order, meaningful alt text and labels, confusing flows, and real screen reader behavior all need human review.
