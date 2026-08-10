# 07. Part E - Architecture / opinion questions (tradeoff-first answers expected)

> Source: `interview-prep/nextjs/05-interview-questions.md`

These are the questions where interviewers are testing judgment, not recall. Never answer with just a definition - always state the tradeoff and your actual decision.

**Q: When would you NOT use the App Router for a new project?**
> "If the team has deep existing investment in Pages Router patterns and libraries that don't yet support Server Components well, or if the project is small enough that the migration/learning cost outweighs the benefits. I wouldn't avoid App Router by default in a new project today, but I wouldn't force a mid-migration on an unrelated deadline either."

**Q: When is client-side rendering (CSR) actually the right choice in Next.js, not a fallback?**
> "When the data is inherently live/continuously changing and per-user, like a real-time delivery tracker or a chat feed - there's no meaningful 'static' version of that content to server-render, so I server-render a shell/skeleton and let a client-side data layer (React Query, WebSocket subscription) own it from there."

**Q: How do you decide between time-based ISR and on-demand revalidation for a given piece of content?**
> "If updates are unpredictable and I control the mutation path (an admin dashboard I also built), on-demand `revalidateTag` gives instant consistency with no wasted regenerations. If updates come from a source I don't control the write path for (a third-party feed, or I just want a safety net), time-based `revalidate` is simpler and doesn't require wiring invalidation into every possible write path. In practice I often use both - on-demand as the primary path, time-based as a fallback."

**Q: Your Next.js app and NestJS backend are both yours to design - would you ever put business logic in a Next.js Route Handler?**
> "For something genuinely page-specific - reshaping or combining a couple of backend calls into one response tailored to a dashboard's needs - yes, that's a reasonable BFF responsibility. I wouldn't put core domain rules there, like order-state transitions or payment logic, because that needs to be consistent across every client that touches it, not just the web frontend."

**Q: How would you convince a team to migrate part of a Pages Router app to App Router?**
> "I wouldn't propose a wholesale rewrite. I'd pick one concrete, measurable pain point - e.g. a slow, JS-heavy page or an awkward shared layout - migrate just that route, measure the actual improvement (bundle size, load time), and use that as the case for incremental, route-by-route migration rather than a big-bang change."

---
