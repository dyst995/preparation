# 09. Empty / error / offline states

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Designing each of: empty (no data yet, not an error), error (something broke), offline (no connectivity), loading/skeleton
- [ ] Giving each state a clear next action, not a dead end (retry button, "add your first X" CTA, explanation)
- [ ] Distinguishing "no results for this filter" from "no data exists yet" from "failed to load"
- [ ] Offline-first considerations: cached last-known data with a "showing offline data" indicator vs a hard blocking screen
- [ ] Skeleton loaders vs spinners for perceived performance

### State design table

| State | What the user sees | What they can do next |
|---|---|---|
| Empty (no data yet) | Friendly illustration/text: "No transactions yet" | CTA relevant to the screen (e.g. "Make your first transfer") |
| Empty (filtered) | "No results match your filters" | Clear/reset filters action |
| Error (request failed) | Clear, non-technical message + reason if safe to show | Retry button; support contact for repeated failures |
| Offline | Banner indicating offline + cached data still shown if available | Auto-retry on reconnect; manual retry option |
| Loading (first load) | Skeleton matching the eventual layout | N/A, but avoid layout shift once data arrives |

### Interview question

**Q: What UX states must every fintech action screen support, at minimum?**

> "At minimum: idle/initial, loading, success, error (with retry), empty (when applicable, distinguished from an error), and offline. For anything involving money movement specifically, I also add a pending/processing state that's distinct from both loading and error, because a request in flight or awaiting server confirmation isn't the same as either � collapsing them causes exactly the 'did it go through?' problem we discussed with idempotency."

---
