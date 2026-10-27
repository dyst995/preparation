# React 06 — Forms & Accessibility (REACT-251–REACT-300)

React 18+ (React 19 form actions noted where relevant). Compact handbook format.

---

### REACT-251 — Controlled vs uncontrolled inputs
**Difficulty:** Junior
**Category:** Forms
**Question:** What is the difference between a controlled and an uncontrolled input in React? When would you pick each?
**Answer:** A controlled input's value lives in React state: `value` + `onChange` make React the single source of truth. An uncontrolled input keeps its value in the DOM; you read it via a ref, `FormData`, or on submit. Controlled suits live validation, masking, dependent fields, and instant UI feedback. Uncontrolled is simpler and cheaper for plain submit-only forms, and it's the only option for file inputs. Most real forms mix both.
**Follow-up:** Can an input switch between the two?

Answer: It can, but React warns. Going from `undefined` to a defined `value` flips modes and causes bugs, so always initialise controlled values (e.g. `''`).

### REACT-252 — `value` vs `defaultValue`
**Difficulty:** Junior
**Category:** Forms
**Question:** What does `defaultValue` do, and how does it differ from `value`?
**Answer:** `defaultValue` sets the initial DOM value of an uncontrolled input; React doesn't track later changes. `value` makes the input controlled and React overwrites the DOM on every render. Changing `defaultValue` after mount does nothing. To reset an uncontrolled form to new defaults, remount with a `key` or call `form.reset()`. Same idea applies to `defaultChecked` for checkboxes and radios.
**Code:**
```jsx
<input name="email" defaultValue={user.email} />
<input value={email} onChange={e => setEmail(e.target.value)} />
```
**Follow-up:** Why doesn't updating `defaultValue` update the field?

Answer: It's only read on mount, mirroring the HTML `value` attribute vs property distinction. Use `key={user.id}` to remount when the source record changes.

### REACT-253 — "value without onChange" warning
**Difficulty:** Junior
**Category:** Forms
**Question:** Why does React warn when you pass `value` without `onChange`, and how do you fix it?
**Answer:** A controlled input with no handler becomes read-only: typing is ignored because React re-renders the same value. The warning flags a likely bug. Fix by adding `onChange` that updates state, using `defaultValue` for uncontrolled behaviour, or adding `readOnly` if it is intentionally non-editable. Don't silence it with a noop handler unless you really mean a locked field.
**Follow-up:** Difference between `readOnly` and `disabled`?

Answer: `readOnly` is focusable and submitted with the form; `disabled` is not focusable and is excluded from submission.

### REACT-254 — Cursor jumping in controlled inputs
**Difficulty:** Intermediate
**Category:** Forms
**Question:** A controlled text input's caret jumps to the end while typing. What typically causes this?
**Answer:** The rendered value differs from what the user typed — e.g. transforming input (formatting, trimming, uppercase) or updating state asynchronously (after `await` or a debounce). React resets the DOM value, which moves the caret. Fix by updating state synchronously with exactly what the DOM holds, then derive formatted display separately, or manually restore `selectionStart` in a layout effect. Debounce side effects, not the field state.
**Follow-up:** How do you debounce validation safely?

Answer: Keep raw input state immediate and debounce a derived value or the validation call, never the `value` itself.

### REACT-255 — Reading uncontrolled inputs
**Difficulty:** Junior
**Category:** Forms
**Question:** How can you read values from an uncontrolled form, and what are the options?
**Answer:** Three approaches: refs per input (`ref.current.value`), `new FormData(form)` on submit (best for many fields keyed by `name`), or `event.currentTarget.elements`. `FormData` scales well and works with native validation. Refs suit imperative needs like focusing. Avoid `document.querySelector` inside React components.
**Code:**
```jsx
function onSubmit(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
}
```
**Follow-up:** What does `FormData` skip?

Answer: Disabled fields, unchecked checkboxes/radios, and inputs without a `name`.

### REACT-256 — Handling many fields
**Difficulty:** Junior
**Category:** Forms
**Question:** How do you manage a form with many controlled fields without writing a handler per field?
**Answer:** Store values in one object and use a shared `onChange` that reads `name` and `value` from the event, updating via computed key and functional state. Handle checkboxes via `checked`. For complex forms with arrays, nesting, or validation, move to a form library or `useReducer`. Beware that every keystroke re-renders the whole form in this pattern.
**Code:**
```jsx
const onChange = e => {
  const { name, value, type, checked } = e.target;
  setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
};
```
**Follow-up:** What's the render-performance downside?

Answer: Each keystroke re-renders the parent and all children; fix by splitting components, memoizing, or using an uncontrolled-based library like RHF.

### REACT-257 — Checkbox, radio, and select
**Difficulty:** Junior
**Category:** Forms
**Question:** How do controlled checkboxes, radios, and selects differ from text inputs?
**Answer:** Checkboxes use `checked` (not `value`) and read `e.target.checked`. Radios in a group share a `name`, and each has `checked={selected === option}`. `<select>` takes `value` on the `<select>` itself in React (not `selected` on options); `multiple` needs an array. Always render real `<label>`s so click targets and screen readers work.
**Follow-up:** Why `value` on `<select>` instead of `selected` on `<option>`?

Answer: React normalises it so all form controls share the same controlled API.

### REACT-258 — Why use a form library
**Difficulty:** Intermediate
**Category:** Form libraries
**Question:** When is hand-rolled state enough for forms, and when should you reach for a form library?
**Answer:** Hand-rolled is fine for 1–5 fields with simple rules. Libraries pay off when you need: per-field touched/dirty/error state, schema validation, nested or dynamic arrays, async validation, performance on large forms, and consistent submit handling. The cost is a dependency, API learning curve, and sometimes awkward integration with custom UI components.
**Trade-offs:** Less boilerplate and better perf vs. abstraction, bundle size, and library lock-in.
**Follow-up:** What's the third option besides library or manual state?

Answer: Native `<form>` with `FormData`, server actions, and native constraint validation, which is often enough for simple flows.

### REACT-259 — React Hook Form vs Formik
**Difficulty:** Intermediate
**Category:** Form libraries
**Question:** At a high level, how do React Hook Form and Formik differ, and which would you choose?
**Answer:** RHF is uncontrolled-first: it registers inputs via refs, so typing doesn't re-render the form, giving better performance and a small bundle. Formik is controlled-first, simpler mentally with state-driven rendering, but re-renders more and has seen slower maintenance. Both support schema validation (Zod/Yup). Default to RHF for new projects; Formik is acceptable in existing codebases.
**Trade-offs:** RHF: perf, ecosystem momentum; needs `Controller` for controlled UI libs. Formik: familiar API; more re-renders.
**Follow-up:** When do you need RHF's `Controller`?

Answer: When wrapping third-party controlled components (custom selects, date pickers) that don't expose a native input ref.

### REACT-260 — Validation timing UX
**Difficulty:** Intermediate
**Category:** Validation UX
**Question:** When should validation errors appear: onChange, onBlur, or onSubmit?
**Answer:** Showing errors while the user is still typing ("invalid email" after one character) is hostile. Common pattern: validate on blur for first-time feedback, then revalidate on change once a field has errored ("reward early, punish late"). Always validate on submit and focus the first invalid field. Some checks (password strength, character count) are helpful live. Match timing to field cost and user intent.
**Follow-up:** What's RHF's `mode` option?

Answer: It sets when validation first triggers (`onSubmit`, `onBlur`, `onChange`, `onTouched`), and `reValidateMode` controls it after the first submit.

### REACT-261 — Schema validation with shared schemas
**Difficulty:** Intermediate
**Category:** Validation
**Question:** Why use a schema library like Zod for form validation, and how does it fit client and server?
**Answer:** A schema is a single declarative source of truth for shape and rules, giving type inference plus consistent error messages. The same schema can run in the browser for UX and on the server for enforcement, avoiding drift. Form libraries integrate through resolvers. Keep UI-specific messages mappable, and don't assume client validation is trustworthy.
**Code:**
```ts
const Schema = z.object({ email: z.string().email(), age: z.coerce.number().min(18) });
const result = Schema.safeParse(Object.fromEntries(formData));
```
**Follow-up:** Why `z.coerce` for form values?

Answer: Form values arrive as strings, so numbers and dates need coercion before validation.

### REACT-262 — Never trust client validation
**Difficulty:** Junior
**Category:** Validation
**Question:** If the client validates a form, why must the server validate again?
**Answer:** Client checks are a UX convenience; anyone can bypass them with curl, devtools, or a modified client. The server must enforce authentication, authorization, types, ranges, and business rules, and return structured field errors the UI can render. Also handle uniqueness and race conditions that only the server can know (e.g. "email taken").
**Follow-up:** How do you display server field errors?

Answer: Return an error map keyed by field name and render it next to the inputs (or set it into the form library, e.g. RHF `setError`).

### REACT-263 — Native form + FormData
**Difficulty:** Intermediate
**Category:** Native forms
**Question:** Why might you prefer a plain `<form>` and `FormData` over controlled state in React 18+?
**Answer:** Native forms give you free behaviours: Enter-to-submit, constraint validation (`required`, `type`, `pattern`), autofill, `reset`, and progressive enhancement. With uncontrolled inputs you avoid re-renders per keystroke and heavy state wiring. Add React only where you need live UI (previews, conditional fields). It's less code and often more accessible.
**Follow-up:** How do you trigger native validation UI manually?

Answer: Call `form.reportValidity()` or `checkValidity()`, or just submit and let the browser block invalid submissions (don't add `noValidate` unless you handle errors yourself).

### REACT-264 — `<form action={fn}>` in React 19
**Difficulty:** Intermediate
**Category:** Actions
**Question:** What does passing a function to `<form action>` do in React 19?
**Answer:** React calls the function with `FormData` on submit, wraps it in a transition, and resets uncontrolled fields after a successful action. The function can be async (client) or a server function (frameworks with RSC). It enables pending state tracking and progressive enhancement when using server functions. You no longer need `preventDefault` or manual `FormData` construction.
**Code:**
```jsx
async function save(formData) { await api.save(formData.get('name')); }
<form action={save}><input name="name" /><button>Save</button></form>
```
**Follow-up:** What happens to inputs after the action?

Answer: React resets uncontrolled form fields automatically; controlled inputs keep their state.

### REACT-265 — `useActionState`
**Difficulty:** Intermediate
**Category:** Actions
**Question:** What is `useActionState` and what problem does it solve?
**Answer:** It returns `[state, formAction, isPending]`, wrapping an action `(prevState, formData) => newState`. It lets an action return validation errors or a result that you render, without separate `useState` plumbing, and gives a pending flag. It composes with `<form action={formAction}>`. It replaces the earlier `useFormState` name from canary/DOM.
**Code:**
```jsx
const [state, action, pending] = useActionState(submit, { errors: {} });
<form action={action}>…{state.errors.email}</form>
```
**Follow-up:** Where does `prevState` come from?

Answer: React passes the last returned state (or the initial state on first call), enabling sequential or accumulating results.

### REACT-266 — `useFormStatus`
**Difficulty:** Intermediate
**Category:** Actions
**Question:** What does `useFormStatus` provide and what is its main constraint?
**Answer:** It returns `{ pending, data, method, action }` for the parent `<form>` submission, which is ideal for a reusable `SubmitButton` that disables itself while pending. Constraint: it must be called from a component rendered *inside* the form, not the component that renders the `<form>` itself. It's imported from `react-dom`.
**Code:**
```jsx
function Submit() { const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>; }
```
**Follow-up:** Why doesn't it work in the same component as `<form>`?

Answer: It reads status from the nearest parent form context, so the component calling it must be a descendant.

### REACT-267 — Optimistic UI with forms
**Difficulty:** Senior
**Category:** Actions
**Question:** How does `useOptimistic` fit with form actions, and what are the risks?
**Answer:** `useOptimistic(state, reducer)` lets you show the expected result immediately while the action is pending; React reverts to real state when the action settles. Pair it with a form action to append a comment or toggle a like instantly. Risks: showing success for something that fails, so surface errors clearly, keep updates idempotent, and don't use it for irreversible or high-stakes operations like payments.
**Follow-up:** What happens on failure?

Answer: The optimistic value is discarded when the transition ends and the UI falls back to authoritative state; you should show an error message.

### REACT-268 — Preventing double submit
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you prevent users from submitting a form twice?
**Answer:** Client side: track pending (`useFormStatus`, `isPending`, or `isSubmitting`) and disable or guard the submit handler. Disabling the button alone is brittle (Enter key, slow state updates), so also early-return in the handler. Server side: use idempotency keys or unique constraints, since retries, refreshes, and multiple tabs can still duplicate. Keep the button accessible while pending (see aria-disabled).
**Follow-up:** Why isn't disabling the button enough?

Answer: Enter-key submissions and fast double clicks can fire before the disabled state renders, and it does nothing against network retries.

### REACT-269 — File inputs
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you handle `<input type="file">` in React, and why can't it be controlled?
**Answer:** Browsers forbid setting a file input's value programmatically for security, so it's always uncontrolled. Read `e.target.files` (a `FileList`) in `onChange`, or use `FormData`. Validate type and size client-side for UX, but re-validate on the server. For uploads, consider direct-to-storage signed URLs, progress via XHR or fetch streams, and `accept`/`multiple` attributes.
**Code:**
```jsx
<input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
```
**Follow-up:** How can you clear a file input?

Answer: Set `ref.current.value = ''` (allowed for clearing) or remount it with a changed `key`.

### REACT-270 — File previews and object URLs
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you show an image preview for a selected file and avoid memory leaks?
**Answer:** Use `URL.createObjectURL(file)` for a preview `src` and revoke it with `URL.revokeObjectURL` when the file changes or the component unmounts, typically in an effect cleanup. `FileReader.readAsDataURL` works too but is heavier. Derive the URL from the `file` state rather than creating it during render, which would leak a new URL every render.
**Code:**
```jsx
useEffect(() => { if (!file) return;
  const url = URL.createObjectURL(file); setPreview(url);
  return () => URL.revokeObjectURL(url); }, [file]);
```
**Follow-up:** Why not create the URL in render?

Answer: Render must be pure; it would allocate a new blob URL on every render and never free it.

### REACT-271 — Multi-step form state
**Difficulty:** Senior
**Category:** Multi-step forms
**Question:** How would you design state for a multi-step (wizard) form?
**Answer:** Keep one source of truth for all step data, either a parent component, a reducer/context, a form library `FormProvider`, or the URL/server draft. Each step validates its own slice before advancing, but final submit validates the whole schema. Persist progress (URL step param, sessionStorage, or server draft) so refresh and back-button work. Don't unmount-and-lose data: lift state above step components.
**Trade-offs:** One big form = simple submit but heavy; per-step forms = isolated validation but more merge logic.
**Follow-up:** Where should the current step live?

Answer: In the URL (e.g. `?step=2`) when you want deep links and back/forward support; otherwise in local state.

### REACT-272 — Resetting forms with `key`
**Difficulty:** Intermediate
**Category:** Forms
**Question:** How do you reset a form's state when the record being edited changes?
**Answer:** Give the form (or its container) a `key` equal to the record id so React remounts it with fresh state and `defaultValue`s. This avoids syncing props into state with effects, which is error-prone. For an explicit reset button, use `form.reset()` for uncontrolled forms or reinitialise state/library values (`reset(values)` in RHF).
**Code:**
```jsx
<EditForm key={user.id} initial={user} />
```
**Follow-up:** Why avoid `useEffect` to copy props into state?

Answer: It causes an extra render with stale values and subtle bugs; a key-driven remount is simpler and correct.

### REACT-273 — Unsaved changes warning
**Difficulty:** Senior
**Category:** Forms
**Question:** How do you warn users about losing unsaved form changes?
**Answer:** Track a dirty flag (form library `isDirty`, or compare to initial values). Add a `beforeunload` listener for tab close/refresh while dirty, and use your router's blocker for in-app navigation (e.g. React Router `useBlocker`). Remove listeners when clean or after save. Browsers show generic text only. Prefer autosave/drafts where possible, since warnings are friction.
**Follow-up:** Why not just always confirm?

Answer: Constant prompts train users to dismiss them; only block when there is real unsaved data.

### REACT-274 — Labels and `useId`
**Difficulty:** Junior
**Category:** Accessibility
**Question:** How do you correctly associate labels with inputs in React, and why use `useId`?
**Answer:** Use `<label htmlFor={id}>` matching the input's `id`, or wrap the input inside the label. Labels give the control its accessible name and enlarge the click target. `useId` generates stable, SSR-safe unique ids so reusable components don't collide or cause hydration mismatches. Don't generate ids with `Math.random()`.
**Code:**
```jsx
const id = useId();
<label htmlFor={id}>Email</label><input id={id} type="email" />
```
**Follow-up:** Can I use `useId` output for CSS selectors?

Answer: Not reliably, since it contains colons; use it for ids/ARIA references and use classes for styling.

### REACT-275 — Placeholder is not a label
**Difficulty:** Junior
**Category:** Accessibility
**Question:** Why shouldn't a placeholder replace a visible label?
**Answer:** Placeholders disappear when typing, lowering memory support; they usually have poor contrast; and they aren't reliably exposed as the accessible name across assistive tech. Users with cognitive disabilities are hit hardest. Use a persistent visible label; use placeholder only for an example format hint. If design insists on floating labels, keep a real `<label>` element.
**Follow-up:** When is a visually hidden label acceptable?

Answer: When surrounding context makes purpose obvious (like a search box with a search button), but keep the label in the DOM for screen readers.

### REACT-276 — `aria-label`, `aria-labelledby`, `aria-describedby`
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** What are the differences between `aria-label`, `aria-labelledby`, and `aria-describedby`?
**Answer:** `aria-label` gives a string accessible name directly. `aria-labelledby` points to element ids whose text forms the name (preferred when visible text exists). `aria-describedby` references supplementary description (hints, errors) read after the name. Prefer native `<label>`/text first: ARIA is a fallback. A name says *what it is*; a description says *extra help*.
**Follow-up:** Which wins if multiple naming sources exist?

Answer: `aria-labelledby` takes precedence over `aria-label`, which takes precedence over native labels in the accessible name computation.

### REACT-277 — Accessible field errors
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** How do you make a field's validation error accessible?
**Answer:** Render the error text adjacent to the field, link it with `aria-describedby`, and set `aria-invalid="true"` while invalid. Don't rely on color or an icon alone: include text such as "Email must include @". Keep messages specific and actionable. Also avoid hiding the error element when empty in a way that breaks the id reference.
**Code:**
```jsx
<input id="e" aria-invalid={!!err} aria-describedby={err ? 'e-err' : undefined} />
{err && <p id="e-err">{err}</p>}
```
**Follow-up:** Does `aria-invalid` replace error text?

Answer: No; it only signals state. The message text is what tells the user how to fix it.

### REACT-278 — Announcing errors
**Difficulty:** Senior
**Category:** Accessibility
**Question:** How should form submit errors be announced to screen reader users?
**Answer:** Move focus to the first invalid field (its description is read) or to an error summary heading with links to each field. Alternatively, use a live region (`role="alert"` or `aria-live`) for the summary. Avoid announcing every keystroke error. Don't both move focus and fire a duplicate alert unnecessarily. Test with a real screen reader, since behaviour varies.
**Trade-offs:** Focus move is reliable and navigable; live regions are non-disruptive but can be missed or double-read.
**Follow-up:** Why an error summary with links?

Answer: It lists all problems in one place and lets keyboard users jump to each failing field.

### REACT-279 — Live regions: polite vs assertive
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** How do `aria-live` regions work, and when use `polite` vs `assertive`?
**Answer:** A live region announces content changes without moving focus. `polite` waits for the user to pause (status, "Saved", results count); `assertive` interrupts (critical errors); `role="status"` and `role="alert"` imply these. The region must exist in the DOM *before* its content changes, so render the container always and update its text. Overuse is noisy.
**Code:**
```jsx
<div role="status" aria-live="polite">{saved ? 'Changes saved' : ''}</div>
```
**Follow-up:** Why might an announcement not be read?

Answer: The live region was mounted at the same time as its text, so assistive tech never observed a change.

### REACT-280 — Focus first invalid field
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** After a failed submit, why and how do you move focus to the first invalid field?
**Answer:** Otherwise keyboard and screen reader users don't know the submit failed or where to fix it. Collect refs (or query `[aria-invalid="true"]`) and call `.focus()` after errors render, inside an effect or after state update. Form libraries do this (`shouldFocusError` in RHF). Pair with a visible error and consider scrolling it into view below sticky headers.
**Follow-up:** Why call focus in an effect?

Answer: The error markup and `aria-invalid` need to be committed to the DOM first; effects run after commit.

### REACT-281 — Semantic HTML over div soup
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** Why use semantic HTML elements instead of styled `div`s?
**Answer:** Native elements ship roles, keyboard behaviour, focus handling, and form integration for free: `button`, `a`, `nav`, `main`, `ul`, `table`, `dialog`. Divs need ARIA, tabindex, and key handlers re-implemented, usually imperfectly. Semantics also help SEO, reader modes, and testability (`getByRole`). First rule of ARIA: don't use ARIA if a native element does the job.
**Follow-up:** Can you give a quick example of the cost?

Answer: A `div onClick` isn't focusable, ignores Enter/Space, and has no role; a `<button>` gives all three.

### REACT-282 — Button vs clickable div
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** What do you lose with `<div onClick>` compared to `<button>`, and when is `<a>` correct?
**Answer:** Lost: keyboard focus, Enter/Space activation, role announcement, disabled semantics, and form submit behaviour. Use `<button>` for actions (do something) and `<a href>` for navigation (go somewhere), so middle-click, "open in new tab", and link lists work. Set `type="button"` to avoid accidental form submits. If you must use a div, add `role`, `tabIndex=0`, and key handlers, which is rarely worth it.
**Follow-up:** Why `type="button"`?

Answer: Buttons in a form default to `type="submit"`, which would trigger form submission unexpectedly.

### REACT-283 — Heading hierarchy
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** Why does heading order matter, and how do you keep it correct in a component-based app?
**Answer:** Screen reader users navigate by headings, so levels (h1→h2→h3) should reflect document outline without skipping for styling reasons. One `h1` per page is the practical convention. In reusable components, don't hardcode levels: accept a `level` prop or derive from context, and style independently of semantics via CSS classes. Check it with an outline tool or axe.
**Follow-up:** Can headings be chosen by size?

Answer: No; choose by structure and apply visual size with CSS.

### REACT-284 — Landmarks
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** What are landmark regions and why use them?
**Answer:** Landmarks (`header`, `nav`, `main`, `aside`, `footer`, `section` with a name, `form` with a name) let assistive tech users jump between page areas. Use one `main`; label multiple `nav`s with `aria-label` to distinguish ("Primary", "Footer"). Don't wrap everything in landmarks, as too many dilute navigation value.
**Follow-up:** When does `section` become a landmark?

Answer: Only when it has an accessible name (e.g. `aria-labelledby`); otherwise it's a generic grouping.

### REACT-285 — Skip links
**Difficulty:** Junior
**Category:** Keyboard
**Question:** What is a skip link and how do you implement it in a React app?
**Answer:** A skip link is the first focusable element, letting keyboard users bypass repeated navigation to `main`. Implement as `<a href="#main">Skip to content</a>` with a target `id="main"` (and `tabIndex={-1}` on it so focus actually lands). Visually hide until focused (not `display:none`). In SPAs, ensure client-side routing doesn't break the hash target.
**Code:**
```jsx
<a className="skip" href="#main">Skip to content</a>
<main id="main" tabIndex={-1}>…</main>
```
**Follow-up:** Why not `display:none`?

Answer: Hidden elements aren't focusable or exposed; use an offscreen/clip technique that reveals it on `:focus`.

### REACT-286 — Keyboard navigation and `tabIndex`
**Difficulty:** Intermediate
**Category:** Keyboard
**Question:** How should `tabIndex` be used, and what are the pitfalls of positive values?
**Answer:** `tabIndex={0}` adds an element to natural tab order; `-1` makes it programmatically focusable only (for focus management targets). Positive values override DOM order, creating confusing, unmaintainable tab sequences, so avoid them. Prefer DOM order matching visual order and native interactive elements. Always keep a visible `:focus-visible` style and never remove outlines without a replacement.
**Follow-up:** Why can CSS reordering hurt accessibility?

Answer: Visual order can diverge from DOM/tab order, so focus jumps unpredictably.

### REACT-287 — Roving tabindex
**Difficulty:** Senior
**Category:** Keyboard
**Question:** What is the roving tabindex pattern, and when do you use it in React?
**Answer:** For composite widgets (tabs, toolbars, menus, radio-like lists), only one item has `tabIndex={0}` while others have `-1`; arrow keys move focus and update which item is "0". The whole widget is a single tab stop, matching WAI-ARIA conventions. Track the active index in state and focus via refs. Alternative is `aria-activedescendant`. Prefer headless libraries (Radix, React Aria) over hand-rolling.
**Follow-up:** Why only one tab stop?

Answer: It keeps tabbing fast across a page; arrows handle movement inside the widget.

### REACT-288 — Focus on route change
**Difficulty:** Senior
**Category:** Focus management
**Question:** What accessibility problem do SPAs have on navigation, and how do you address it?
**Answer:** Client-side routing doesn't reload the page, so focus stays on the clicked link and screen readers get no cue that content changed. After navigation, move focus to the new page's `h1` or `main` (`tabIndex={-1}`), update `document.title`, and optionally announce via a live region. Many routers/frameworks offer helpers, but verify behaviour manually.
**Follow-up:** Why update the document title?

Answer: Screen readers announce the title on page load; in SPAs it's one of the main signals of navigation.

### REACT-289 — Accessible modals
**Difficulty:** Senior
**Category:** Focus management
**Question:** What must an accessible modal dialog do?
**Answer:** Move focus into the dialog on open, trap Tab within it, close on Escape, restore focus to the trigger on close, and make background content inert (`aria-modal="true"` plus `inert` or `aria-hidden` on siblings). Use `role="dialog"` with an accessible name. Prefer native `<dialog>` with `showModal()`, which handles much of this, or a vetted library. Render via a portal.
**Trade-offs:** Native `<dialog>` = less code, good support; libraries = consistent styling/animation and edge-case handling.
**Follow-up:** Why restore focus?

Answer: Otherwise focus resets to the document start, forcing keyboard users to re-navigate from the top.

### REACT-290 — Dismissal: Escape and outside click
**Difficulty:** Intermediate
**Category:** Focus management
**Question:** How do you correctly implement dismissal of popovers and dialogs for keyboard and pointer users?
**Answer:** Support Escape via a `keydown` listener (cleaned up in an effect), and outside click via `pointerdown` on the document, checking `ref.contains(event.target)`. Don't make click-outside the only dismissal path: always include a visible close button. Ensure focus returns to the trigger. For nested layers, only the topmost should close on Escape.
**Follow-up:** Why `pointerdown` over `click`?

Answer: It fires before focus/selection changes and avoids closing when a drag starts inside and ends outside.

### REACT-291 — `disabled` vs `aria-disabled`
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** What's the difference between `disabled` and `aria-disabled`, and when use each?
**Answer:** The `disabled` attribute removes the control from tab order, blocks events, and excludes it from form submission. `aria-disabled="true"` only conveys state to assistive tech; the element stays focusable and you must block activation yourself. Use `aria-disabled` when users need to discover why a button is unavailable (focusable with explanation); use `disabled` for truly inert controls and while pending submits.
**Follow-up:** Downside of `disabled` submit buttons for invalid forms?

Answer: Users get no feedback on what's wrong; consider keeping it enabled and showing errors on submit.

### REACT-292 — Color contrast as a product concern
**Difficulty:** Intermediate
**Category:** Accessibility
**Question:** Why is color contrast a product and design-system concern rather than just a dev detail?
**Answer:** WCAG AA needs 4.5:1 for normal text, 3:1 for large text and UI components/focus indicators. Contrast affects low-vision users, glare conditions, and legal compliance. It's cheapest to enforce in design tokens and the design system (approved palette pairs, dark mode, disabled/placeholder states), plus CI checks. Fixing it per-component after launch causes rebrand-scale rework.
**Follow-up:** Does passing automated checks guarantee good contrast?

Answer: No; tools miss text over images/gradients and states like hover or focus, so review them manually too.

### REACT-293 — Don't rely on color alone
**Difficulty:** Junior
**Category:** Accessibility
**Question:** Why shouldn't color be the only way to convey meaning (e.g. errors in red)?
**Answer:** Color-blind users and monochrome displays can miss it, and screen readers can't see it at all. Add redundant cues: text ("Error:"), icons with accessible names, patterns, underline on links, and ARIA state like `aria-invalid`. Required fields should be marked with text or an asterisk explained in the form, not just a red border.
**Follow-up:** How do you check this quickly?

Answer: Use grayscale/color-blindness emulation in browser devtools and see if status is still obvious.

### REACT-294 — Accessible names and hiding content
**Difficulty:** Intermediate
**Category:** Screen readers
**Question:** How do `display:none`, `visibility:hidden`, `aria-hidden`, and a visually-hidden class differ for assistive tech?
**Answer:** `display:none` and `visibility:hidden` remove content from both view and the accessibility tree. `aria-hidden="true"` hides it from assistive tech but leaves it visible. A visually-hidden (sr-only) class hides visually but keeps it available to screen readers. Use sr-only for icon-button text, and `aria-hidden` for decorative icons.
**Code:**
```jsx
<button><svg aria-hidden="true" />&nbsp;<span className="sr-only">Delete</span></button>
```
**Follow-up:** How should icon-only buttons be named?

Answer: Give them text via sr-only content or `aria-label`; never leave a nameless button.

### REACT-295 — `aria-hidden` on focusable elements
**Difficulty:** Senior
**Category:** Screen readers
**Question:** Why is putting `aria-hidden="true"` on a container with focusable children a bug?
**Answer:** Keyboard users can still tab into elements that screen readers are told don't exist, producing "silent" focus stops. When hiding offscreen content (drawers, background behind modals), also make it unfocusable: use `inert`, `hidden`, or `display:none`, or set `tabIndex={-1}`. The `inert` attribute handles both focus and AT exposure.
**Follow-up:** What does `inert` do?

Answer: It makes a subtree non-interactive, unfocusable, and hidden from the accessibility tree.

### REACT-296 — Custom widgets: combobox, select, tabs
**Difficulty:** Staff
**Category:** ARIA patterns
**Question:** Should you build custom comboboxes/selects/tabs yourself? How do you approach it?
**Answer:** Rarely. These patterns need precise roles, states, keyboard maps, focus handling, and screen reader testing (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, etc.). Prefer native `<select>` where possible, otherwise headless libraries (React Aria, Radix, Headless UI, Ariakit) that follow WAI-ARIA APG and expose styling hooks. If building, follow APG exactly and test with VoiceOver/NVDA.
**Trade-offs:** Libraries cost dependency/bundle and some design constraints but remove a large class of accessibility bugs.
**Follow-up:** Why is native `<select>` often still best?

Answer: It's accessible, mobile-optimized, and keyboard-complete out of the box, at the cost of limited styling.

### REACT-297 — `fieldset` and `legend`
**Difficulty:** Junior
**Category:** Accessibility
**Question:** When should you group controls with `<fieldset>` and `<legend>`?
**Answer:** For related controls that share a question, such as radio groups, checkbox groups, or address blocks. The legend becomes the group's accessible name and is announced with each control, giving context like "Shipping method: Standard". A `div role="group"` with `aria-labelledby` is an alternative. Without grouping, radios read as "Standard, radio button" with no question.
**Follow-up:** Can `fieldset` be disabled as a group?

Answer: Yes; `disabled` on the fieldset disables all descendant controls.

### REACT-298 — Input types, `autocomplete`, and `inputMode`
**Difficulty:** Intermediate
**Category:** Forms
**Question:** Which native input attributes improve usability and accessibility in forms?
**Answer:** Correct `type` (`email`, `tel`, `url`, `number`, `date`) triggers appropriate mobile keyboards and validation. `autocomplete` tokens (`email`, `given-name`, `one-time-code`, `current-password`) enable autofill and are a WCAG requirement for identity fields. `inputMode="numeric"` gives a numeric keypad without `type=number`'s quirks (e.g. for card or OTP). Also `required`, `min`, `pattern`, and `enterKeyHint`.
**Follow-up:** Why avoid `type="number"` for IDs or card numbers?

Answer: It allows spinner changes, drops leading zeros, and scroll-wheel edits; use text with `inputMode="numeric"` and `pattern`.

### REACT-299 — Testing accessibility: RTL and axe
**Difficulty:** Intermediate
**Category:** Testing
**Question:** How do you test accessibility in a React codebase at a basic level?
**Answer:** Query by role and name with React Testing Library (`getByRole('button', {name: /save/i})`), which naturally validates semantics and labels. Add `jest-axe` (or `@axe-core/playwright`) to catch rule violations like missing labels or bad ARIA. Use `userEvent` to test keyboard flows (Tab, Enter, Escape, focus return). Automation catches roughly a third of issues, so complement it with manual keyboard and screen reader checks.
**Code:**
```jsx
const { container } = render(<Form />);
expect(await axe(container)).toHaveNoViolations();
```
**Follow-up:** Why prefer `getByRole` over `getByTestId`?

Answer: It asserts what users and assistive tech actually perceive and fails when semantics break.

### REACT-300 — Accessibility strategy for a team
**Difficulty:** Staff
**Category:** Accessibility
**Question:** How would you build accessibility into a product team's process rather than treat it as a late audit?
**Answer:** Shift left: accessible design-system primitives and tokens (contrast, focus, spacing), `eslint-plugin-jsx-a11y` in lint, axe checks in unit/E2E and CI gates, and Storybook a11y addons. Add definition-of-done items (keyboard path, labels, focus order), regular manual screen-reader passes, and an owner or champions group. Track issues like bugs, and involve users with disabilities when possible. Target WCAG 2.2 AA.
**Trade-offs:** Upfront investment and slower first delivery vs. avoiding costly retrofits, legal risk, and excluded users.
**Follow-up:** What can't automated tools find?

Answer: Logical focus order, meaningful alt text and labels, confusing flows, and real screen reader behaviour all need human review.
