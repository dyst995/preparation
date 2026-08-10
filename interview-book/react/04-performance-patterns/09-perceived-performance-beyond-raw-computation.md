# 09. Perceived performance beyond raw computation

> Source: `interview-prep/react/04-performance-patterns.md`

Interviewers value candidates who understand that **perceived** speed often matters more than raw milliseconds:

- **Skeleton screens / optimistic UI** - show a plausible layout or optimistic result immediately, rather than a blank screen or spinner, even if the real data takes the same time to arrive.
- **Progressive rendering** - render what you have as soon as it's available (e.g., stream in above-the-fold content) instead of waiting for everything.
- **Avoiding layout shift** - reserve space for images/async content so the page doesn't jump around as things load (also a Core Web Vitals concern - Cumulative Layout Shift).
- **Instant feedback on interaction** - disable a button and show a spinner immediately on click, even before the network request resolves, so the app never feels unresponsive to input.

### Interview question

**Q: Is a faster raw computation always the right performance fix?**

> "Not necessarily - perceived performance often matters more to users than raw computation time. Showing a skeleton screen or optimistic result immediately, giving instant feedback on click before a request resolves, and avoiding layout shift as content loads can make an app *feel* dramatically faster without changing a single millisecond of actual work. I treat 'make it feel fast' and 'make it compute fast' as related but distinct goals, and profile/measure user-perceived metrics (like Largest Contentful Paint, Cumulative Layout Shift, Time to Interactive) alongside raw render timings."

---
