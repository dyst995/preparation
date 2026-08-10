# 02. Validation strategies

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Schema-based validation (Zod/Yup) paired with `react-hook-form` for RN forms
- [ ] Validation timing: on blur vs on change vs on submit, and why timing affects perceived friction
- [ ] Async validation (e.g. checking if a recipient account number exists) with debouncing
- [ ] Field-level vs form-level error display
- [ ] Server-driven validation errors mapped back onto specific fields
- [ ] Disabling submit vs allowing submit-then-show-errors (accessibility and UX tradeoffs)

### Timing strategy table

| Strategy | Feels like | Best for |
|---|---|---|
| Validate on every keystroke | Naggy if done for length/format errors early | Real-time formatting feedback (e.g. card number spacing), not error shaming |
| Validate on blur | Balanced � user gets feedback after finishing a field | Most form fields (email format, required fields) |
| Validate only on submit | Least naggy, but user finds all errors at once, at the end | Simple/short forms, or as a fallback with field-level on-blur layered on top |
| Debounced async validation | Necessary for anything requiring a network round trip | Recipient/account lookups, username availability |

### Interview question

**Q: How do you validate a money-transfer form without annoying the user?**

> "I use a schema (Zod) with `react-hook-form`, validating most fields on blur so errors appear once the user's done with a field, not mid-keystroke. For anything numeric like amount, I do live formatting rather than live error-shaming � reformat as they type, don't flag 'invalid' until they've stopped. For anything requiring a server round trip, like validating a recipient account number, I debounce the check and show a lightweight inline spinner rather than blocking the whole form. On submit, I re-run full validation and map any server-side errors (e.g. 'insufficient funds') back onto the relevant field or a form-level banner, since some errors can only be known server-side."

---
