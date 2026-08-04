
# 05 - Forms, UI & CSS

> Goal: Master controlled/uncontrolled forms, form libraries, core HTML semantics, Flexbox/Grid mental models, practical Tailwind patterns, and accessibility basics - the "browser-native" React knowledge that's easy to underestimate and commonly tested at product companies.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Explain controlled vs uncontrolled inputs, and when each is the right choice.
2. Build a form with validation, submission state, and error handling without a library, then explain what a library like React Hook Form buys you.
3. Explain the difference between semantic and non-semantic HTML and why it matters beyond "best practice."
4. Explain Flexbox and Grid mental models well enough to lay out common UI patterns from memory.
5. Explain practical Tailwind patterns: utility-first philosophy, responsive/state variants, `@apply`, component extraction, design tokens/theming.
6. Explain accessibility basics: semantic elements, ARIA roles/attributes, keyboard navigation, focus management, labels.
7. Debug common form bugs: input lag, controlled/uncontrolled warnings, submission race conditions.

---

## 1. Controlled vs uncontrolled inputs

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

## 2. Building a form from scratch - the full mental model

```jsx
function SignupForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  function validate(vals) {
    const errs = {};
    if (!vals.email.includes('@')) errs.email = 'Enter a valid email';
    if (vals.password.length < 8) errs.password = 'Password must be at least 8 characters';
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitSignup(values);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
      />
      {errors.email && <p id="email-error" role="alert">{errors.email}</p>}

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        aria-invalid={!!errors.password}
        aria-describedby={errors.password ? 'password-error' : undefined}
      />
      {errors.password && <p id="password-error" role="alert">{errors.password}</p>}

      {submitError && <p role="alert">{submitError}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}
```

Notice what this hand-rolled example already needs: shared `handleChange` via `name` attribute, a validation function, error state per field, submission-in-flight state (to disable the button and prevent double-submits), submit-error state, and accessibility wiring (`htmlFor`/`id`, `aria-invalid`, `aria-describedby`, `role="alert"`). Scale this to 15 fields with cross-field validation and conditional fields, and the boilerplate becomes real - which is exactly the case for a form library.

### The double-submit bug (common, worth knowing by heart)

Without disabling the submit button (or otherwise guarding) during submission, a fast double-click fires `handleSubmit` twice, potentially creating duplicate server-side records. `disabled={isSubmitting}` above is the minimal fix; a more robust one also guards inside the handler itself (`if (isSubmitting) return;` at the top) in case disabling the button doesn't prevent the handler from being invoked via other paths (e.g., Enter key submission racing with a click).

### Interview question

**Q: How do you prevent a form from being submitted twice?**

> "Track an `isSubmitting` flag in state, set it true at the start of the submit handler, disable the submit button while it's true, and guard the top of the handler to bail out early if a submission is already in flight - covering both the disabled-button case and any other path that might trigger submission, like pressing Enter while a click is already processing. I reset it in a `finally` block so it clears whether the request succeeds or fails."

---

## 3. Form libraries - what they actually buy you

### React Hook Form (most common pairing with your stack)

Core idea: uses **uncontrolled inputs internally via refs**, so typing does **not** trigger a re-render of the form component on every keystroke - a deliberate performance-first design, in contrast to older controlled-everything approaches (like classic Formik, which re-renders on every field change by default).

```jsx
import { useForm } from 'react-hook-form';

function SignupForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(data) {
    await submitSignup(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: 'Email is required', pattern: { value: /@/, message: 'Invalid email' } })} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <input type="password" {...register('password', { minLength: { value: 8, message: 'Min 8 characters' } })} />
      {errors.password && <p role="alert">{errors.password.message}</p>}

      <button disabled={isSubmitting}>Submit</button>
    </form>
  );
}
```

`register('email', {...})` wires the input to RHF's internal (ref-based) tracking and validation rules, without your component re-rendering per keystroke - only re-rendering when something you actually subscribe to (like `errors` or `isSubmitting`) changes.

### What form libraries solve in general

| Problem | Hand-rolled cost | Library solution |
|---|---|---|
| Per-keystroke re-renders on large forms | Real cost with controlled inputs at scale | Ref-based/uncontrolled tracking (RHF) avoids this by default |
| Validation (sync/async, cross-field, schema-based) | Hand-written, easy to get inconsistent across fields | Schema integration (Zod/Yup) plugged in via a resolver |
| Field arrays (dynamic add/remove rows) | Fiddly key/index management | `useFieldArray` and similar utilities |
| Touched/dirty/submission state per field | Manual bookkeeping per field | Built into `formState` |
| Accessibility wiring | Manual `aria-*`/`htmlFor` per field | Some libraries provide it or make it easy to standardize centrally |

### Schema validation integration (Zod example)

```jsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

This centralizes validation rules in one typed schema shared potentially with the backend/API contract, instead of scattering ad hoc rules across `register()` calls.

### Interview question

**Q: Why would you reach for React Hook Form instead of hand-rolling a form?**

> "Mainly performance and reduced boilerplate at scale. RHF tracks inputs via refs rather than controlled state, so typing doesn't trigger a re-render of the whole form component - that matters a lot on large forms. It also centralizes validation (including schema-based validation via Zod/Yup resolvers), touched/dirty/error state per field, and utilities like field arrays for dynamic rows, all of which I'd otherwise hand-roll and re-verify for consistency across every form in the app. For a two-field login form, hand-rolling is often fine; for anything with 10+ fields, conditional fields, or dynamic arrays, a library pays for itself quickly."

---

## 4. HTML semantics - why it's not just "best practice"

### Semantic vs non-semantic elements

```html
<!-- Non-semantic: a div soup that LOOKS like a button/nav but isn't one to assistive tech or the browser -->
<div class="button" onclick="submit()">Submit</div>
<div class="nav">...</div>

<!-- Semantic: conveys meaning and behavior for free -->
<button onclick="submit()">Submit</button>
<nav>...</nav>
```

### Concrete costs of non-semantic markup

- **`<div onClick>` is not keyboard-accessible by default** - it doesn't receive focus via Tab, doesn't respond to Enter/Space, and has no default `role` announced to screen readers. A real `<button>` gets all of this natively, free, with zero extra code.
- **Screen readers rely on semantics** to announce element purpose ("button," "navigation landmark," "heading level 2") - a `<div>` announces as nothing meaningful.
- **SEO and browser features** - `<nav>`, `<main>`, `<header>`, `<footer>`, heading hierarchy (`<h1>`-`<h6>`) inform search engines and browser "reader mode"/outline features.
- **Form semantics** - `<label>`/`<input>` association (via `htmlFor`/`id`, or wrapping) lets clicking the label focus the input and lets screen readers announce the field's purpose; a `<button type="submit">` inside a `<form>` gets Enter-to-submit behavior for free.

### `<button type="button">` vs default

Inside a `<form>`, a `<button>` with no `type` attribute defaults to `type="submit"` - a very common bug source where a "cancel" or "toggle" button inside a form accidentally submits it. Always be explicit: `type="button"` for non-submit buttons inside forms.

### Interview question

**Q: Why does semantic HTML matter beyond "it's cleaner"?**

> "It's functional, not just stylistic. A `<div onClick>` isn't keyboard-focusable or operable via Enter/Space by default, and announces nothing meaningful to screen readers - you'd have to manually re-implement `tabIndex`, keyboard handlers, and ARIA roles to match what a real `<button>` gives you for free. Semantic elements like `<nav>`, `<main>`, heading hierarchy, and proper `<label>`/`<input>` association also drive assistive technology navigation, browser reader modes, and SEO. Defaulting to semantic elements first, and only reaching for `<div>`/`<span>` plus ARIA when there's genuinely no matching native element, avoids re-implementing browser behavior worse than the browser already does it."

---

## 5. Flexbox mental model

### The core mental model

Flexbox lays out children along a **main axis** and a **cross axis**, determined by `flex-direction`.

| Property (on container) | Controls |
|---|---|
| `display: flex` | Turns on flex layout for direct children |
| `flex-direction: row \| column \| row-reverse \| column-reverse` | Defines the main axis |
| `justify-content` | Alignment along the **main** axis (`flex-start`, `center`, `space-between`, `space-around`, `flex-end`) |
| `align-items` | Alignment along the **cross** axis (`flex-start`, `center`, `stretch`, `baseline`, `flex-end`) |
| `flex-wrap: nowrap \| wrap` | Whether children wrap to new lines when they don't fit |
| `gap` | Space between children (both axes, or `row-gap`/`column-gap` individually) |

| Property (on a child) | Controls |
|---|---|
| `flex-grow` | How much a child grows to fill extra space, relative to siblings' grow values |
| `flex-shrink` | How much a child shrinks when space is tight |
| `flex-basis` | The child's initial size before growing/shrinking is applied |
| `flex: 1` shorthand | `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` - "take an equal share of available space" |
| `align-self` | Overrides the container's `align-items` for just this one child |

### Common layout recipes

```css
/* Horizontal nav bar, items spaced apart, vertically centered */
.navbar { display: flex; justify-content: space-between; align-items: center; }

/* Vertically and horizontally centered content (a very common interview ask) */
.center { display: flex; justify-content: center; align-items: center; }

/* Sidebar + main content, sidebar fixed width, main fills the rest */
.layout { display: flex; }
.sidebar { flex: 0 0 240px; }   /* don't grow, don't shrink, base width 240px */
.main { flex: 1; }              /* take all remaining space */

/* Equal-width columns */
.columns { display: flex; gap: 16px; }
.column { flex: 1; }
```

### Interview question

**Q: How do you perfectly center a div both horizontally and vertically with Flexbox?**

> "`display: flex; justify-content: center; align-items: center;` on the parent centers the child along both the main axis (`justify-content`) and cross axis (`align-items`), assuming the default `flex-direction: row`."

---

## 6. Grid mental model

### When Grid beats Flexbox

Flexbox is fundamentally **one-dimensional** (a single row or column, even if it wraps). Grid is **two-dimensional** - you define rows and columns simultaneously and place items into cells, making it the better tool for actual page/dashboard layouts, not just single rows/columns of items.

| Property (on container) | Controls |
|---|---|
| `display: grid` | Turns on grid layout |
| `grid-template-columns` / `grid-template-rows` | Defines the column/row tracks, e.g. `repeat(3, 1fr)` for 3 equal columns |
| `gap` | Space between grid cells |
| `grid-template-areas` | Named layout regions for readable, declarative page layout |

```css
/* Classic dashboard layout: header, sidebar, main content, footer */
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
}
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }
```

```css
/* Responsive card grid without media queries - auto-fills as many columns as fit at >=200px each */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

### Interview question

**Q: When would you reach for Grid instead of Flexbox?**

> "When the layout is genuinely two-dimensional - I need to control rows and columns together, like a page shell with a header, sidebar, main content, and footer, or a card grid that wraps responsively. Flexbox is one-dimensional; it's great for a single row or column of items (a toolbar, a list, centering a single element), but coordinating both axes at once with named regions is where Grid is the clearly better, more declarative tool - `grid-template-areas` reads almost like an ASCII diagram of the layout."

---

## 7. Tailwind CSS - practical patterns

### The utility-first philosophy

Instead of writing custom CSS classes and switching files/context to style something, Tailwind provides small, composable utility classes applied directly in markup.

```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
  Save
</button>
```

**Why teams choose this:** no context-switching between CSS files and markup, no naming struggles (no more inventing `.btn-primary-outline-small-v2`), a constrained design-token system (spacing/color scales) that keeps a large team's UI visually consistent by default, and unused styles are automatically purged from the production build (no growing dead CSS file over time).

### State and responsive variants

```jsx
<input className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 invalid:border-red-500" />

<div className="text-sm md:text-base lg:text-lg">
  {/* mobile-first: base styles apply first, then overridden at each breakpoint and up */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* stacked on mobile, side-by-side from md breakpoint up */}
</div>
```

Tailwind is **mobile-first**: unprefixed utilities apply at all sizes; prefixed ones (`md:`, `lg:`) apply from that breakpoint **upward**, not as isolated ranges.

### Avoiding class-name soup: extraction strategies

When a utility string grows unwieldy and repeats across many places, two common fixes:

**1. Extract a React component** (usually preferred in a component-based codebase - keeps logic and style together, supports props/variants cleanly):

```jsx
function PrimaryButton({ children, ...props }) {
  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
```

**2. `@apply` in a CSS file** (useful when you want a reusable class name outside JSX, e.g., shared with server-rendered/non-component markup):

```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700;
}
```

**Interview-level nuance:** most modern Tailwind teams prefer **component extraction over `@apply`** as the default, because `@apply` reintroduces a layer of indirection (you have to jump to a CSS file to see what a class means) that utility-first CSS was designed to avoid; `@apply` is best reserved for cases where a component wrapper genuinely isn't practical.

### Design tokens / theming via `tailwind.config.js`

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
      },
      spacing: { 18: '4.5rem' },
    },
  },
};
```

Extending the theme (rather than hardcoding arbitrary hex values inline) keeps the design system centralized and consistent - `bg-brand-500` instead of `bg-[#3b82f6]` scattered everywhere, which also makes rebranding/theming a config change instead of a codebase-wide find/replace.

### Common Tailwind criticisms and your response

**"Tailwind makes markup unreadable/verbose."** Fair critique for very long class strings; mitigated by component extraction (encapsulate the verbosity once, reuse the clean component everywhere) and editor tooling (class sorting, IntelliSense).

**"It's inline styles with extra steps."** Not quite - unlike inline styles, Tailwind utilities support pseudo-classes (`hover:`, `focus:`, `disabled:`), responsive variants, dark mode variants, and are subject to CSS specificity/cascade rules and purge/tree-shaking - inline styles can do none of this.

### Interview question

**Q: What's your philosophy on when to extract a Tailwind utility string into something reusable?**

> "Once a utility combination repeats across multiple places, or a single string gets long enough to hurt readability, I extract a component - like `<PrimaryButton>` - rather than reaching for `@apply`, because keeping the style co-located with the component preserves Tailwind's core benefit of not context-switching between files. I reserve `@apply` for cases where a component wrapper isn't practical, like shared markup outside the component tree. For design consistency, I push colors/spacing into `tailwind.config.js` as theme tokens rather than hardcoding arbitrary values, so the whole app pulls from one source of truth."

---

## 8. Accessibility (a11y) basics

### The baseline checklist for any interactive UI

- [ ] Every `<img>` has meaningful `alt` text (or `alt=""` if purely decorative).
- [ ] Every form input has an associated `<label>` (via `htmlFor`/`id`, or wrapping).
- [ ] Interactive elements are real semantic elements (`<button>`, `<a href>`) wherever possible, not `<div onClick>`.
- [ ] Custom interactive components (built from `<div>`s because no native element fits) have the right `role`, are keyboard-operable (`tabIndex`, Enter/Space handling), and manage focus correctly.
- [ ] Color is never the *only* way information is conveyed (e.g., error states also have an icon/text, not just red color, for colorblind users).
- [ ] Sufficient color contrast between text and background (WCAG AA is the common baseline: 4.5:1 for normal text).
- [ ] Focus is visible (don't remove `outline` without providing a clear visible replacement focus style).
- [ ] Modals trap focus while open and return focus to the triggering element on close.
- [ ] Live regions (`aria-live`, `role="alert"`/`role="status"`) announce dynamic content changes (form errors, toast notifications) to screen readers without requiring focus to move there.

### ARIA - the first rule of ARIA

> "No ARIA is better than bad ARIA." Prefer native semantic HTML first; only add ARIA roles/attributes to fill gaps native HTML can't cover (e.g., a custom dropdown/combobox, a tab interface, a custom modal).

### Common ARIA attributes worth knowing

| Attribute | Purpose |
|---|---|
| `aria-label` | Accessible name for an element with no visible text (e.g., an icon-only button) |
| `aria-labelledby` | Points to another element's `id` to use as this element's accessible name |
| `aria-describedby` | Points to an element providing extra descriptive text (e.g., a field's error message) |
| `aria-invalid` | Marks a form field as currently invalid |
| `aria-hidden="true"` | Hides purely decorative content from assistive tech (e.g., a decorative icon next to a labeled button) |
| `aria-expanded` | Whether a collapsible/disclosure widget (accordion, dropdown) is currently open |
| `role="alert"` | Announces content immediately and assertively when it appears (form/submission errors) |
| `role="status"` | Announces content politely, without interrupting (e.g., "Saved" confirmation) |
| `role="dialog"` + `aria-modal="true"` | Identifies a custom modal for assistive tech, combined with manual focus trapping |

### Focus management example (custom modal)

```jsx
function Modal({ isOpen, onClose, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement;
      dialogRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();   // return focus to the trigger on close
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" ref={dialogRef} tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      {children}
    </div>
  );
}
```

### Interview question

**Q: A designer hands you a custom dropdown built entirely from `<div>`s. What accessibility work is needed?**

> "First I'd push back and check whether a native `<select>` (possibly styled) actually meets the design - native elements handle most of this for free. If a custom implementation is genuinely required, it needs a `role` matching its behavior (e.g., `listbox`/`combobox` patterns from the ARIA Authoring Practices), keyboard support (arrow keys to navigate options, Enter/Space to select, Escape to close), visible focus indicators, `aria-expanded` on the trigger, and correctly managed programmatic focus - moving focus into the option list when opened and back to the trigger when closed. This is meaningfully more work than a native element, which is exactly why I default to native HTML first and only build custom widgets when there's no equivalent."

---

## Interview question bank (forms, UI, CSS)

1. **Controlled vs uncontrolled inputs - tradeoffs and when to choose each?**
2. **What causes the "changing an uncontrolled input to be controlled" warning?**
3. **How do you prevent a form from double-submitting?**
4. **Why does React Hook Form avoid per-keystroke re-renders while a naive controlled form doesn't?**
5. **Why is `<div onClick>` a worse choice than `<button>` for a clickable action, concretely (not just "best practice")?**
6. **What's the default `type` of a `<button>` inside a `<form>`, and what bug does forgetting to set `type="button"` cause?**
7. **Explain `justify-content` vs `align-items` in Flexbox.**
8. **When would you choose CSS Grid over Flexbox?**
9. **How do you keep Tailwind utility strings maintainable as a component grows?**
10. **What's the "first rule of ARIA," and why does it matter?**
11. **What must a well-built custom modal handle for accessibility beyond just visually looking like a modal?**
12. **How do you ensure form error messages are accessible to screen reader users, not just visually present?**

---

## Hands-on drills (do these)

- [ ] Build a signup form from scratch (no library) with validation, submission state, and accessible error messages; then rebuild the same form with React Hook Form + Zod and compare line count and re-render behavior (add a render counter to prove RHF doesn't re-render per keystroke).
- [ ] Intentionally trigger the "uncontrolled to controlled" warning, then fix it.
- [ ] Build a responsive card grid with CSS Grid (`auto-fill`/`minmax`) that reflows column count without any media queries; resize the window to verify.
- [ ] Build a small design-system button component in Tailwind with variants (primary/secondary/disabled) using either conditional class composition or a utility like `clsx`/`cva`.
- [ ] Build a custom modal with correct focus trapping and focus-return-on-close; test it with only a keyboard (no mouse) to confirm you can operate it end to end.
- [ ] Run a real page through a browser accessibility audit (e.g., Lighthouse or axe DevTools) and fix at least 3 flagged issues.

---

## Senior red flags / green flags

### Green flags interviewers love
- Precisely explaining *why* `<div onClick>` is worse than `<button>`, not just citing "best practice."
- Knowing the mechanism behind the controlled/uncontrolled warning, not just how to silence it.
- Reaching for Grid vs Flexbox based on dimensionality, not habit.
- Bringing up focus management/keyboard operability unprompted when discussing custom components.

### Red flags
- Using `<div onClick>` for all interactive elements without any keyboard/ARIA consideration.
- Not knowing why a "cancel" button inside a `<form>` needs `type="button"`.
- Treating accessibility as "add `alt` text and you're done."
- Writing Tailwind utility soup with no extraction strategy as forms/components grow, with no articulated opinion on when to extract.

---

## Mastery checklist

- [ ] I can explain controlled vs uncontrolled inputs and correctly choose between them for a given scenario.
- [ ] I can build a validated, accessible form from scratch without a library.
- [ ] I can explain what React Hook Form does differently under the hood and why it matters for performance.
- [ ] I can lay out common UI patterns (centering, sidebar+main, responsive card grid) with Flexbox/Grid from memory.
- [ ] I can articulate a clear Tailwind extraction philosophy (component vs `@apply`) and defend it.
- [ ] I can name and apply the core accessibility checklist items to a real component without prompting.
