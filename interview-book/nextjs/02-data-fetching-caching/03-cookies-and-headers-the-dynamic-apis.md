# 03. cookies() and headers() - the dynamic APIs

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

### Topics to learn

- [ ] `cookies()` and `headers()` (from `next/headers`) read request-specific data
- [ ] Calling either of these inside a Server Component **opts that route out of static rendering** - it becomes dynamic (rendered per request), because the output can now legitimately differ per request
- [ ] This is one of the most common causes of "why is my page suddenly SSR instead of static" bugs
- [ ] `cookies().set(...)` for writing cookies is only allowed in Server Actions and Route Handlers, not in a plain Server Component render
- [ ] `NextRequest`/`NextResponse` give the same cookie/header access inside Middleware and Route Handlers

### Example

```tsx
import { cookies } from "next/headers";

export default async function AccountPage() {
  const sessionToken = cookies().get("session")?.value;
  const user = await getUser(sessionToken); // per-user, can't be statically cached
  return <Profile user={user} />;
}
```

The moment `cookies()` is called here, Next.js marks this route as dynamic - it will render fresh on every request rather than being cached in the Full Route Cache.

### Interview question

**Q: I added a personalization feature (read a cookie for locale/theme) and now my formerly-static marketing page is slow. Why?**

> "Reading `cookies()` or `headers()` anywhere in that route's render path opts the whole route out of static rendering, because Next.js can no longer guarantee the output is the same for every visitor. If I still want most of the page static, I'd isolate the cookie-dependent part into its own small Server Component (or even push it to the client), and wrap it in `<Suspense>` so only that slice is dynamic/streamed while the rest of the page stays statically cached."

---
