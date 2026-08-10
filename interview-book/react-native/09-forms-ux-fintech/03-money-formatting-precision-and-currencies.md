# 03. Money formatting, precision, and currencies

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Why floating-point (`number` in JS) is unsafe for money math (binary floating-point can't represent many decimal fractions exactly)
- [ ] Representing money as integer minor units (cents/tetri) for arithmetic, formatting only at display time
- [ ] `Intl.NumberFormat` for locale-correct currency display
- [ ] Rounding strategy consistency (always round the same way, ideally server-authoritative)
- [ ] Multi-currency display and conversion-rate staleness warnings
- [ ] Never trust client-computed totals for anything that gets submitted � server must re-validate/re-compute

### The core rule

> **Never do money arithmetic in floating-point `number`.** Store and compute in integer minor units (e.g. cents), and only convert to a decimal string at the final display step. If you need arbitrary precision or currency-safe math libraries, use a dedicated decimal library rather than raw `+`/`-`/`*` on floats.

```ts
// BAD � floating point drift
const total = 0.1 + 0.2; // 0.30000000000000004

// BETTER � integer minor units, format only for display
const amountInCents = 1050; // 10.50
const formatted = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amountInCents / 100);
```

### Interview question

**Q: Why shouldn't you store money as a JS `number` and do direct arithmetic on it?**

> "Binary floating-point can't exactly represent many decimal fractions, so repeated arithmetic accumulates rounding drift � `0.1 + 0.2` isn't exactly `0.3` in floating point. In a fintech context that's unacceptable; a fraction of a cent of drift compounding across thousands of transactions is a real liability. I represent amounts as integer minor units (cents) for all arithmetic and comparisons, and only convert to a formatted decimal string at the final display layer using something like `Intl.NumberFormat` for locale-correct currency symbols and separators. And critically, the client never has final authority over a computed total � the server recomputes and validates it before committing any transaction."

**Follow-up:** How do you handle displaying amounts in multiple currencies?
> Store the amount and its currency together, format with `Intl.NumberFormat` per-currency, and if you show converted estimates, clearly label them as estimates with the rate's timestamp � never let a stale conversion rate look authoritative on a confirmation screen.

---
