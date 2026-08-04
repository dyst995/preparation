
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

## Senior-Level Best Practices

### Decision frameworks & tradeoffs

**Controlled vs. uncontrolled - beyond the basic tradeoff table.** The chapter's table covers the mechanical tradeoff; the senior-level addition is considering the *form's growth trajectory*. A 3-field login form built controlled today rarely becomes a performance problem - but a form that starts at 3 fields and organically grows to 40 (a common product-driven trajectory: settings pages, onboarding wizards) can quietly become a real re-render cost if every field is individually controlled with no isolation. The senior move is deciding upfront whether a form is "likely to stay small" (controlled is fine, simplest to reason about) or "likely to grow into a complex, many-field form" (reach for React Hook Form or a similar uncontrolled-by-default library from day one, since retrofitting later touches every field).

**`@apply` vs. component extraction - a more nuanced call than "always extract a component."** Component extraction is right when the styled element has component-like behavior (props, variants, internal logic). `@apply` is legitimately better when you need a class name usable outside the component tree entirely - server-rendered email templates, markdown-generated HTML, or a design-system CSS file consumed by a non-React part of the stack. Treating `@apply` as strictly inferior in all cases misses this real use case; the decision should be "does this need to be a class name usable outside JSX," not a blanket rule.

**Custom ARIA widget vs. pushing back on the design.** Building a fully-correct custom dropdown/combobox with proper keyboard navigation, focus management, and ARIA roles is a genuinely significant engineering investment (the ARIA Authoring Practices patterns are non-trivial to implement correctly). The senior default is pushing back on designs that require a fully custom widget when a native element (styled) would meet 90% of the visual requirement, reserving the real investment in custom accessible widgets for cases where the interaction genuinely can't be expressed with native HTML (a rich autocomplete with grouped, multi-select results, for example).

### Production checklists

- [ ] Every form field has a real, associated `<label>` (via `htmlFor`/`id` or wrapping) - verified with an automated accessibility audit (axe DevTools/Lighthouse) as part of CI or a pre-release checklist, not just eyeballed.
- [ ] Every submit button in a multi-button form has an explicit `type` attribute (`submit` or `button`) - no reliance on the implicit default, since it's a common and easy-to-miss source of accidental form submission.
- [ ] Async form submissions guard against double-submit both via a disabled button state and a guard at the top of the handler itself.
- [ ] Any custom-built interactive widget (dropdown, modal, tabs, accordion) that isn't a native HTML element has been tested with keyboard-only navigation (no mouse) end to end, and with a screen reader at least once before shipping.
- [ ] Color contrast for all text/background combinations meets WCAG AA (4.5:1 for normal text, 3:1 for large text) - checked with a contrast checker tool as part of the design handoff process, not assumed from "it looks fine."
- [ ] Tailwind utility strings beyond a certain length/repetition threshold (a team-agreed guideline, e.g., "more than ~8-10 classes repeated in 3+ places") are extracted into a component - enforced via code review convention, not left to individual judgment inconsistently.

### Anti-patterns

- **Building a fully custom-styled `<div>`-based form control (checkbox, radio, select) without replicating the native element's keyboard/ARIA behavior**, purely because the native element's default styling was hard to override - the actual fix is usually a visually-hidden native input paired with a styled sibling element (the well-established "visually hide the real input, style a decorative sibling that mirrors its state" pattern), not abandoning the native element's accessibility for free-form styling.
- **Validating only on submit for a long, multi-step form**, forcing users to scroll back through many fields to find scattered errors after a failed submission - for anything beyond a couple of fields, at least on-blur validation per field (not necessarily on every keystroke, which can feel aggressive) is a meaningfully better UX with a proportionate implementation cost.
- **Using `outline: none` to remove a focus ring "because it looks cleaner" without providing any visible replacement focus indicator** - this is one of the single most common, and most damaging, accessibility regressions, since it makes the entire app unusable for keyboard-only users trying to track where focus currently is.
- **Overriding Tailwind's design tokens with arbitrary one-off values (`bg-[#3a7bd5]`, `p-[13px]`) scattered throughout a codebase** instead of extending the theme config - this defeats the entire purpose of a constrained design-token system, reintroducing the "every value is slightly different" inconsistency Tailwind's utility-first approach was meant to prevent.

### Failure modes

- **A screen-reader user unable to complete a form because dynamically-appearing validation errors have no `aria-live`/`role="alert"` wiring** - the error is visually obvious to a sighted user but completely silent to a screen reader user unless the DOM change is announced, a failure mode that's invisible in normal visual QA and only caught by explicit accessibility testing.
- **A "controlled to uncontrolled" warning suppressed by silencing the console** rather than fixed, later surfacing as a real bug where a field's displayed value doesn't match its actual form state after an async data load completes at an unexpected time relative to the component's render cycle.
- **A modal's focus trap breaking after a later refactor adds a portal or changes the DOM structure**, silently regressing keyboard accessibility (Tab escaping the modal to the page behind it) without any visual symptom for a mouse-only manual tester to notice - a class of regression that specifically requires keyboard-only or screen-reader testing to catch, which is exactly why it's easy for it to slip through typical QA.
- **A responsive Tailwind layout that looks correct at the tested breakpoints (mobile/desktop) but breaks at an untested intermediate width** - a common gap when responsive design is only manually checked at a couple of device presets in browser DevTools rather than by actually resizing the window continuously through the full range.

### Observability

- Run an automated accessibility scan (axe-core via a CI plugin, or Lighthouse CI) on every PR touching UI, and track the violation count as a trend over time - catching a regression at the PR that introduced it is far cheaper than a later dedicated accessibility audit finding a backlog of issues with no clear attribution.
- Track form abandonment/error rates per field in production analytics for any high-value form (signup, checkout) - a specific field with an unusually high error or abandonment rate is a strong, data-backed signal of a real UX problem (validation too strict, confusing label, unexpected format requirement) worth investigating over guessing from the design alone.
- For custom interactive widgets, keep a lightweight internal checklist (keyboard operability, focus management, ARIA roles/states) as a required section in the PR template for any new component of that kind, so accessibility review happens consistently rather than depending on whichever reviewer happens to think of it.

### Team/scale practices

- Establish a shared, reviewed set of accessible base components (button, input, modal, dropdown) that the rest of the team builds on top of, so accessibility correctness is solved once centrally rather than re-derived (and re-risked) in every feature that needs a custom interactive element.
- Include a keyboard-only navigation pass and a quick screen-reader check as a standard step in the team's PR review or QA checklist for any new interactive UI, not an occasional special audit - accessibility regressions are cheapest to catch at the same review stage as everything else, not in a separate, less-frequent process.
- Document the team's Tailwind extraction threshold and `@apply` policy explicitly (in a README or contributing guide) once the team is large enough that inconsistent individual judgment calls start producing visibly different styling patterns across features.

### Senior follow-up Q&A

**Q1: A designer wants a custom-styled checkbox that looks nothing like the native browser checkbox, but must remain fully accessible (keyboard, screen reader, focus states). How do you implement it?**
> "The standard pattern: keep a real `<input type='checkbox'>` in the DOM, visually hide it (not with `display: none`, which removes it from the accessibility tree and keyboard tab order, but with a 'visually hidden' technique like absolute positioning with zero size and `overflow: hidden`), and style a sibling `<span>`/`<div>` that visually represents the checkbox state using CSS selectors keyed off the real input's `:checked`/`:focus-visible` state. This way, all native behavior - keyboard toggling with Space, screen reader announcement of checked/unchecked state, form submission as a real checkbox value - keeps working exactly as browsers expect, while the visual presentation is fully custom. I'd avoid a `<div role='checkbox'>`-only approach unless there's a specific reason the native element genuinely can't work, since it requires manually reimplementing everything the native input provides for free."

**Q2: Your team's forms are increasingly complex, and a colleague suggests migrating everything to React Hook Form immediately, including the app's simplest two-field forms. How do you scope the migration?**
> "I'd prioritize by actual pain: forms with many fields, dynamic field arrays, or measurable re-render performance issues get migrated first, since that's where RHF's uncontrolled-by-default model provides the most concrete benefit. For a genuinely simple two-field login form with no growth expected, hand-rolled controlled state is often just as maintainable and doesn't need the added dependency/API surface - migrating it isn't wrong, but it's low-value work relative to the higher-impact forms, and I'd rather spend that engineering time where the payoff is clearer. I'd frame this as a value-ordered backlog, not a blanket 'migrate everything' initiative."

**Q3: A form validates correctly and looks correct visually, but a screen reader user reports they 'don't know what went wrong' when they submit invalid data. What's likely missing, and how do you fix it?**
> "Almost certainly the error messages aren't wired for assistive tech announcement - they're visually present (red text near the field) but nothing tells a screen reader that new content appeared or that the field is now invalid. The fix: `aria-invalid='true'` on the field itself once it has an error, `aria-describedby` pointing to the error message's `id` so the screen reader announces the error text when the field itself is focused/re-focused, and `role='alert'` (or an `aria-live='assertive'` region) on the error message container so it's announced immediately when it appears, even without the user's focus moving there manually. I'd verify the fix by actually testing with a screen reader (VoiceOver/NVDA), not just adding the attributes and assuming they work as expected."

**Q4: You inherit a Tailwind-heavy codebase with widespread arbitrary-value overrides (`bg-[#3a7bd5]`, `text-[15px]`) instead of theme tokens. How do you approach cleaning this up without a disruptive rewrite?**
> "I'd first extract the actual distinct values in use (a quick grep/regex sweep) and see how much real variation exists versus how much is accidental near-duplicates of what should be the same design token (`#3a7bd5` vs `#3a7cd6` used inconsistently for what's supposed to be the same brand blue). I'd add the genuinely-needed values to `tailwind.config.js` as named tokens, then do an incremental, low-risk find-and-replace pass (ideally with visual regression testing or at least careful manual QA) converting arbitrary values to their new token equivalents, prioritizing the most-repeated values first for the highest consistency payoff per unit of migration effort - not attempting a single big-bang rewrite that risks visual regressions across the whole app at once."

**Q5: A multi-step wizard form loses all entered data if the user accidentally refreshes the browser mid-flow. What are your options, and how do you choose?**
> "Options range from persisting form state to `sessionStorage`/`localStorage` on every field change (simple, works offline, but needs careful handling of sensitive fields like passwords which shouldn't be persisted), to saving progress to the server as a draft after each step (more robust, survives a different device/browser too, but requires backend support and handling partial/invalid draft states), to simply warning the user before navigating away (`beforeunload`) without actually persisting anything (cheapest, but doesn't help if the browser crashes rather than the user intentionally leaving). I'd choose based on how costly re-entering the data is for the user and how sensitive the data is - a long onboarding wizard with no sensitive fields is a strong candidate for `sessionStorage` persistence; a payment form should generally not persist card details client-side at all, and would lean more on `beforeunload` warnings plus a fast re-entry flow instead."

**Q6: How would you explain to a product manager why "just make the whole card clickable" for a list of items sometimes creates an accessibility problem, and how do you fix it while keeping the desired UX?**
> "If the entire card is wrapped in a single `<div onClick>` (or even an `<a>` wrapping many nested interactive elements like a 'favorite' button and a 'share' button), screen reader and keyboard users get an ambiguous or broken experience - nested interactive elements inside another clickable element create confusing focus order and unclear semantics about what activating the card versus the inner button actually does, and native HTML disallows nesting interactive elements like `<button>` inside `<a>` in the first place. The fix that preserves the UX: make the primary click target a real `<a>`/`<button>` that's visually stretched to cover the whole card (a well-known 'stretched link' CSS technique, using a pseudo-element or absolute positioning), while keeping any genuinely separate interactive controls (favorite, share) as distinct, appropriately-stopped-propagation elements outside or clearly separated from that stretched link's hit area - giving one unambiguous primary action per card plus clearly secondary ones, instead of overlapping click targets with undefined precedence."

---

## Mastery checklist

- [ ] I can explain controlled vs uncontrolled inputs and correctly choose between them for a given scenario.
- [ ] I can build a validated, accessible form from scratch without a library.
- [ ] I can explain what React Hook Form does differently under the hood and why it matters for performance.
- [ ] I can lay out common UI patterns (centering, sidebar+main, responsive card grid) with Flexbox/Grid from memory.
- [ ] I can articulate a clear Tailwind extraction philosophy (component vs `@apply`) and defend it.
- [ ] I can name and apply the core accessibility checklist items to a real component without prompting.
