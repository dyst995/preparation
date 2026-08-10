# 09. Section H - "Why did you..." / CV tie-back questions

> Source: `interview-prep/react/06-interview-questions.md`

These test whether you can defend real architectural choices, not just recite definitions.

**H1. Why does your stack use Redux, Zustand, AND React Query instead of just one?**
> See chapter 03 Section 6 model answer - separation of concerns: server state (React Query), global cross-cutting client state (Redux Toolkit), lightweight feature-scoped shared client state (Zustand). Using the right tool per problem reduces total code versus one tool handling everything adequately.

**H2. You've also worked in React Native - what carries over to web React, and what doesn't?**
> Carries over: component model, hooks, reconciliation/rendering mental model, state management patterns (Zustand/Redux/React Query work almost identically in both). Doesn't carry over: the DOM as host (vs native views), CSS/Flexbox nuances (web has full CSS + Grid; RN is Flexbox-only via Yoga with different defaults), browser-specific concerns (forms, accessibility via ARIA/semantic HTML, bundlers/code-splitting, SEO), and browser APIs vs native modules.

**H3. Describe a real performance problem you diagnosed and fixed.**
> Structure with: symptom -> profiling method used -> root cause found -> fix applied -> measured improvement (even approximate numbers are far more convincing than vague claims). Prepare 1-2 concrete examples from actual project experience before the interview, not improvised on the spot.

**H4. Describe a time you chose Zustand over Redux (or vice versa) for a feature - why?**
> Structure with: what kind of state it was, why it didn't warrant full Redux setup (or why it needed Redux's structure), and what the actual tradeoff/outcome was. Prepare a specific real example.

**H5. How do you keep server data fresh without over-fetching?**
> React Query's `staleTime` tuned per query based on how often that data realistically changes, background refetch on window focus/reconnect for data that should self-heal, and explicit `invalidateQueries` calls after mutations that are known to affect specific cached data - rather than blanket polling or refetching on every mount.

**H6. How do you approach accessibility in a Tailwind-heavy codebase, given utility classes don't enforce semantics?**
> Utility classes style elements but don't change their underlying semantics - so the discipline is choosing the right native element first (button, nav, label) regardless of how it's styled, then layering Tailwind utilities on top; accessibility and styling are orthogonal concerns that both need explicit attention.

---
