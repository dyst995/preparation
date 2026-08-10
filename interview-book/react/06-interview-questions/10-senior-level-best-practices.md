# 10. Senior-Level Best Practices

> Source: `interview-prep/react/06-interview-questions.md`

This bank chapter closes with **cross-cutting senior follow-ups** - the kind that combine two or three chapters at once, which is exactly how senior interviewers actually probe depth once the rapid-fire basics are confirmed.

### Decision frameworks & tradeoffs (cross-chapter recap)

- **Re-render bug vs. re-render-count-is-fine-but-render-is-slow bug** -> Profiler first, always; the fix differs completely (stable references + `memo` vs. `useMemo`/virtualization/offloading work).
- **"Where does this state live" (Ch.03) is upstream of "is this component too slow" (Ch.04)** - misclassified state (server data in Redux, frequently-changing data in Context) often *causes* the performance problem being investigated, so the state-classification framework is often the actual fix, not a memoization pattern layered on top of a structural mistake.
- **Accessibility and performance can trade off, and seniors should say so honestly** - e.g., a fully custom, highly-optimized virtualized widget is sometimes less accessible out of the box than a plainer native-element-based one; the right call depends on the audience and requirements, not a reflexive "always do both perfectly."

### Production checklist (condensed, cross-chapter)

- [ ] State is classified (local/client-shared/global/server) before any tool is chosen, and server data never lives primarily in Redux/Zustand.
- [ ] Every list uses a stable `id` key; every memoized component's props are verified stable at the parent.
- [ ] Every effect that starts something (fetch, subscription, timer) cleans it up; `exhaustive-deps` is enforced, not suppressed silently.
- [ ] Every form field is labeled and keyboard-operable; every dynamic error is announced via ARIA, not just visually shown.
- [ ] Bundle size and Core Web Vitals are tracked continuously (CI budget + production RUM), not checked only when someone complains.

### Anti-patterns to name unprompted

- Reflexively reaching for Redux/Context for anything shared, without asking whether it's server state first.
- Memoizing everything "just in case" instead of profiling first.
- `<div onClick>` instead of `<button>`, and `outline: none` with no replacement focus style.
- Index-as-key on a list that can reorder, insert, or delete.
- Silencing `exhaustive-deps`/accessibility lint warnings instead of fixing the underlying issue.

### Senior follow-up Q&A (cross-chapter, harder)

**SQ1. A dashboard feels sluggish only after the user has been on the page for 10+ minutes, not on initial load. Walk through your cross-chapter diagnosis.**
> "This time-dependent pattern points away from a one-time render cost and toward something accumulating - I'd suspect either a memory leak (an effect not cleaning up a subscription/interval/listener, so more and more of them stack up the longer the page is open) or an ever-growing cache/state structure (a React Query cache with `gcTime` set too high accumulating many stale entries, or a Redux/Zustand store that appends to an array on every poll without ever trimming it). I'd take heap snapshots at page-load and at the 10-minute mark and diff retained objects, and separately check the Profiler for whether render *counts* are increasing over time (suggesting an accumulating list feeding a `.map()`) versus render *duration* per component staying flat (pointing more toward a pure memory/GC-pressure issue rather than a rendering one)."

**SQ2. You need to justify, to a skeptical engineering manager, why 'we should invest in an accessibility pass' has real business value, not just compliance value. What's your pitch, grounded in this material?**
> "Beyond legal/compliance risk (which is real and shouldn't be dismissed), accessibility fixes overlap heavily with fixes that improve the product for everyone - semantic HTML that's keyboard-operable also tends to be more robust to unexpected user behavior generally (fast clicking, browser back/forward, assistive input devices used by many more people than just screen-reader users), and a properly labeled, well-structured form reduces support tickets from confused users regardless of ability. I'd also point out that several of the accessibility fixes (focus management, ARIA live regions for async state) are the *same* engineering work needed to make an app feel polished and responsive - it's not purely additive cost, it overlaps substantially with general UX quality work already on the roadmap."

**SQ3. How would you architect state, rendering, and data-fetching for a real-time collaborative document editor (think Google Docs-lite) using this stack (Redux/Zustand/React Query/hooks)?**
> "Server state (the document's persisted content, version history) still goes through React Query for initial load and periodic reconciliation, but the *live* collaborative editing state itself is a special case - it's neither pure client state nor pure server state, it's a real-time synchronized stream, best modeled with a dedicated sync mechanism (WebSocket/CRDT library) feeding into a Zustand store optimized for very frequent updates with fine-grained selectors, since Context would re-render every consumer on every keystroke from any collaborator. For rendering, I'd heavily rely on `memo` at the per-block/per-paragraph level with stable keys so only the actually-edited block re-renders on each incoming change, and I'd use `useTransition` for any expensive derived UI (like a live word count or formatting preview) so a flood of incoming remote edits doesn't block the local user's own typing responsiveness."

**SQ4. A colleague says "we don't need `React.memo` anywhere because React is fast enough these days." How do you respond without either agreeing uncritically or over-defending memoization?**
> "There's real truth in it for most apps most of the time - React's reconciliation is fast, and premature memoization has a real cost, which is exactly this chapter's 'measure first' message. But 'we don't need it anywhere' is an overcorrection; the right framing is 'we don't add it *by default*, we add it when the Profiler shows a specific expensive, frequently-and-unnecessarily-re-rendering component.' I'd point to a concrete example if we have one - a large data table, a chart, a rich editor - where an unmemoized re-render genuinely costs measurable time, as proof the *capability* still matters even if the *default* correctly leans toward not using it."

**SQ5. Explain how a stale closure bug (Ch.02) and a Context re-render problem (Ch.03) could combine to produce a bug that's unusually hard to diagnose.**
> "Imagine a Context provider whose value includes a callback function that closes over some state, and that callback isn't wrapped in `useCallback` with correct dependencies - every Provider re-render creates a fresh callback closing over whatever state was current *at that render*. A consumer far down the tree that captured an earlier version of this callback (e.g., stored it in a ref, or used it inside its own effect with an incomplete dependency array) would silently keep using stale data from whenever it first grabbed the callback, even though the Provider itself has since updated many times with fresh state. Diagnosing this requires recognizing it's actually *two* separate issues compounding - an unstable Context value (fix: memoize it) and a consumer not properly re-subscribing to the latest version (fix: correct dependency array or the 'ref holds latest' pattern) - fixing only one might appear to help without fully resolving the bug, which is a strong signal to look for a second contributing cause."

**SQ6. If you had to cut this entire React track down to the 3 mental models most likely to make or break a senior interview, which would you pick and why?**
> "First: render-phase-must-be-pure plus the render/commit split, because so much else (StrictMode double-invoke, `memo`'s guarantees, why effects exist separately from render logic) derives directly from it. Second: the state-classification framework (local/client-shared/global/server) from chapter 03, because most 'why did you choose X library' questions - the most common senior React interview pattern - collapse into 'did you correctly classify the state first.' Third: 'measure first, profile before optimizing' from chapter 04, because it's the meta-skill that prevents cargo-culting every other pattern in this track (memoization, virtualization, code splitting) without justification - an interviewer who hears this instinct applied consistently across answers is hearing genuine seniority, not memorized definitions."

---
