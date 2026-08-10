# 05. Protected routes end-to-end (App Router)

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

### Topics to learn

- [ ] Layered protection: Middleware (coarse redirect) + Server Component/Layout check (defense in depth) + backend-level authorization (final source of truth)
- [ ] Reading the session in a Server Component to conditionally render or `redirect()`
- [ ] `redirect()` from `next/navigation` inside Server Components/Server Actions - throws internally, must not be caught by a surrounding `try/catch` that swallows it
- [ ] Role-based rendering: don't rely on hiding a button in the UI as your only authorization - the backend must reject unauthorized requests regardless of what the UI shows

### Example: layout-level auth check

```tsx
// app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(cookies().get("session")?.value);
  if (!session) {
    redirect("/login");
  }
  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
```

### Interview question

**Q: If Middleware already redirects unauthenticated users away from `/dashboard`, why check again in the layout?**

> "Defense in depth. Middleware matching can be misconfigured, someone could add a new route under `/dashboard` and forget to check the matcher covers it, or a Route Handler under that path could be hit directly without ever going through the page-rendering path Middleware assumes. I treat Middleware as a fast, coarse first gate for UX (redirect quickly, avoid rendering a page that will immediately bounce), and I treat the actual data-layer and backend checks as the real security boundary that I can't skip."

---
