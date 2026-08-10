# 06. Streaming and Suspense

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] Streaming SSR: the server can send HTML in chunks as it becomes ready, instead of waiting for the entire page
- [ ] `loading.tsx` is sugar for wrapping a route segment in `<Suspense>` automatically
- [ ] You can add your own `<Suspense>` boundaries around slow components for more granular streaming than a whole-route `loading.tsx`
- [ ] Why streaming improves perceived performance: fast shell (nav, layout) shows immediately; slow parts (a report widget hitting a slow DB query) stream in later without blocking the rest
- [ ] Streaming requires the slow work to be inside an `async` Server Component so React can suspend on it
- [ ] Interaction with SEO/crawlers: search engine crawlers generally wait for the full response, but real users see progressive rendering

### Example: granular streaming

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import OrdersSummary from "./orders-summary"; // fast
import RevenueChart from "./revenue-chart";   // slow query

export default function DashboardPage() {
  return (
    <div>
      <OrdersSummary />
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}
```

`OrdersSummary` and the page shell render immediately; `RevenueChart`'s slow `await` doesn't block the rest of the page - a skeleton shows until it resolves and streams in.

### Interview question

**Q: What's the difference between `loading.tsx` and a manual `<Suspense>` boundary?**

> "`loading.tsx` is a route-level convention - Next.js automatically wraps the entire page segment in a Suspense boundary using that file as the fallback, so the whole route shows a skeleton until everything in it resolves. A manual `<Suspense>` boundary lets me be more granular - I can let the fast 80% of a page render immediately and only show a fallback around the one slow widget, which usually gives a better perceived-performance result than an all-or-nothing route-level loading state."

**Q: Does streaming help SEO?**

> "Not directly for crawlers that wait for the full response, but it massively helps real users' perceived load time (Time to First Byte and meaningful paint), and Core Web Vitals like it because content becomes visible and interactive sooner even if total load time is similar."

---
