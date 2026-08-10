# 05. React Query (and SWR) on the client - how they coexist with App Router caching

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

### Topics to learn

- [ ] Server-side caching (fetch cache, Data Cache) solves *initial render* freshness/performance
- [ ] Client-side caching (React Query, SWR) solves *ongoing interactivity*: refetch on focus/reconnect, polling, optimistic mutations, pagination/infinite scroll, dependent queries triggered by user actions
- [ ] Pattern: fetch initial data on the server (fast first paint, good SEO if relevant), pass it as `initialData`/`initialDataUpdatedAt` into a client-side React Query hook so the client doesn't immediately refetch on mount
- [ ] `QueryClientProvider` must live in a Client Component (it uses Context + state internally)
- [ ] Server Components cannot use React Query hooks directly - hooks require the client
- [ ] Don't fight the framework: it's fine (and common in real apps) to have some pages purely Server-Component-fetched and other, more interactive dashboard sections use React Query on the client

### Example: server-fetched initial data + client-side React Query for live updates

```tsx
// app/dashboard/orders/page.tsx  (Server Component)
import OrdersClient from "./orders-client";

export default async function OrdersPage() {
  const initialOrders = await getOrders(); // fast first paint, SSR/ISR as appropriate
  return <OrdersClient initialOrders={initialOrders} />;
}
```

```tsx
// app/dashboard/orders/orders-client.tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrdersFromApi,
    initialData: initialOrders,
    refetchInterval: 15_000, // poll for live warehouse/delivery updates
  });
  return <OrdersTable orders={orders} />;
}
```

> "This is close to what I'd do on a Clean House-style warehouse/delivery dashboard: server-render the initial snapshot so the page is fast and doesn't flash a loading spinner, then hand it to React Query on the client so it can poll or refetch on focus, handle optimistic updates when a manager marks a delivery complete, and manage per-widget loading/error state without me hand-rolling all of that."

### Interview question

**Q: Isn't fetching on the server with the App Router redundant if you're also using React Query on the client?**

> "They solve different problems, not the same one. Server fetching gets you a fast, meaningful first paint and lets Next.js cache/ISR the initial HTML. React Query on the client handles what happens *after* that - background refetching, polling, mutation-driven cache updates, retry/error UI, pagination state. I pass the server-fetched data in as `initialData` so React Query doesn't do a redundant refetch on mount, and then let it own the client-side lifecycle from there. For a page that's read-once and rarely changes, I might skip React Query entirely and just use Server Component fetching plus `revalidateTag` on mutation."

---
