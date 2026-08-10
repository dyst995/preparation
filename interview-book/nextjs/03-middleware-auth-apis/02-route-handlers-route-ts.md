# 02. Route Handlers (route.ts)

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

### Topics to learn

- [ ] File convention: `app/api/orders/route.ts` -> exports named functions per HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- [ ] Receives a `Request`/`NextRequest`, returns a `Response`/`NextResponse`
- [ ] Route Handlers are cached by default for `GET` in some configurations (static) unless they use dynamic APIs - similar rules to page rendering (`cookies()`, `headers()`, `request.method !== 'GET'` etc. push it dynamic)
- [ ] Can run on Node.js or Edge runtime (`export const runtime = "nodejs" | "edge"`)
- [ ] Not the same thing as Server Actions - Route Handlers are traditional REST-style endpoints you can hit from anywhere (including non-Next.js clients, webhooks, mobile apps); Server Actions are RPC-style functions called directly from your own React tree
- [ ] Good for: webhooks (Stripe, payment providers), OAuth callback endpoints, endpoints consumed by mobile apps or third parties, anything that needs a stable public URL and standard HTTP semantics

### Example

```ts
// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const token = cookies().get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await getOrdersForUser(token);
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const order = await createOrder(body);
  return NextResponse.json(order, { status: 201 });
}
```

### Route Handlers vs Server Actions - the real distinction

| | Route Handler | Server Action |
|---|---|---|
| Shape | REST-style HTTP endpoint | RPC-style function, called like a normal async function |
| Callable from | Anywhere - browser fetch, mobile app, webhook, curl | Only from your own app's forms/components (though it does compile to an HTTP POST under the hood) |
| Good for | Public API surface, webhooks, third-party integrations | Form submissions, mutations from your own UI |
| Return shape | You control the `Response` fully (status, headers, body) | Return value is passed back into React as a normal JS value/promise result |

### Interview question

**Q: When would you use a Route Handler instead of a Server Action for a form submission?**

> "If the form is only ever submitted from my own Next.js app's UI, a Server Action is simpler - no manual fetch, automatic progressive enhancement, direct integration with `useFormStatus`/`useActionState`. I'd reach for a Route Handler instead if the same endpoint needs to be called from outside my Next.js app - a webhook from a payment provider, a mobile app hitting the same backend, or a third party integration - because a Route Handler gives me a stable, standard HTTP contract that isn't tied to React's internals."

---
