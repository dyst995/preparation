# 04. Server Components vs Client Components

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] Default: everything in `app/` is a **Server Component** unless the file (or a file it imports) has `"use client"` at the top
- [ ] Server Components can: read files, query databases directly, use secrets/env vars safely, `await` data - none of that code or its dependencies ship to the browser
- [ ] Server Components cannot: use `useState`, `useEffect`, `useContext`, browser-only APIs, event handlers (`onClick`, etc.)
- [ ] Client Components can: use hooks, state, effects, browser APIs, event handlers - but their code (and everything they import) ships as JS to the browser
- [ ] `"use client"` marks a **boundary**, not just one file - everything imported below it in the tree also becomes part of the client bundle
- [ ] Server Components can import and render Client Components; Client Components **cannot** import Server Components directly (but can receive them as `children`/props - the "passing Server Components as children into Client Components" pattern)
- [ ] Passing data from Server to Client Components: props must be serializable (no functions, no class instances, no Dates without conversion consideration)
- [ ] `"use server"` (Server Actions) is a different, related concept - a function callable from the client that always runs on the server (covered more in chapter 03)

### Decision table

| Need | Component type |
|---|---|
| Fetch data directly from DB/API with secrets | Server |
| Render static or server-derived markup, no interactivity | Server |
| `onClick`, `onChange`, form local state | Client |
| `useState`, `useEffect`, `useRef` | Client |
| Browser APIs (`window`, `localStorage`, `IntersectionObserver`) | Client |
| Third-party library that assumes a browser (charts, rich text editors, maps) | Client |
| Context providers (theme, auth session on client, React Query provider) | Client (but can be a thin wrapper used near the root) |

### The "leaf client component" pattern

Push `"use client"` as far down the tree as possible so the minimum amount of JS ships to the browser.

```tsx
// app/dashboard/page.tsx  (Server Component - no directive)
import OrdersTable from "./orders-table"; // Server Component - fetches data
import RefreshButton from "./refresh-button"; // Client Component - just a button

export default async function DashboardPage() {
  const orders = await getOrders(); // runs on the server, no client JS for this
  return (
    <div>
      <RefreshButton />
      <OrdersTable orders={orders} />
    </div>
  );
}
```

```tsx
// app/dashboard/refresh-button.tsx
"use client";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  return <button onClick={() => router.refresh()}>Refresh</button>;
}
```

`OrdersTable` stays a Server Component (renders on the server, zero JS), while only the tiny `RefreshButton` ships interactive JS.

### Common mistake to call out in interviews

> "A common mistake is putting `'use client'` at the top of a big page or layout file just because *one* small piece needs interactivity - that pulls the entire subtree (and everything it imports) into the client bundle. The fix is to isolate the interactive piece into its own small Client Component and keep everything else, including data fetching, on the server."

### Interview questions

**Q: Can a Server Component import a Client Component?**

> "Yes, that's the normal, expected direction - a Server Component renders the shell and imports Client Components for the interactive leaves. What you can't do is import a Server Component from inside a Client Component file, because once you're in client code, everything below it in that import graph is client code too. If a Client Component needs to render a Server Component, the pattern is to accept it as `children` (or another prop) passed down from a Server Component parent, not import it directly."

**Q: What can and can't cross the Server-to-Client boundary as props?**

> "Only serializable values - plain objects, arrays, strings, numbers, booleans. Functions, class instances, Symbols, and things like raw Date objects need care (dates usually get passed as ISO strings and re-parsed, or serialized structures are used). You can't pass a server-only function as a prop for the client to call directly unless it's wrapped as a Server Action."

---
