# 05. Part C - Clean House STAR stories

> Source: `interview-prep/nextjs/05-interview-questions.md`

Use these when asked "tell me about a time you..." or "walk me through a feature you built." Rehearse out loud until fluent - don't read them verbatim in an interview.

### Story 1 - Building major features on an existing Next.js platform

**Situation:** Clean House already had a Next.js platform in production when you joined the work - an existing codebase with its own conventions, not a greenfield build.

**Task:** Develop major new features - manager dashboards, warehouse management, delivery workflows, and customer-facing improvements - without breaking existing functionality or fighting the established architecture.

**Action:**
> "I spent time understanding the existing routing structure, data-fetching patterns, and component conventions before writing new code, so new features matched the codebase's existing rendering strategy and caching approach rather than introducing inconsistent patterns. For the manager dashboard and warehouse management screens, I structured them around persistent layouts so the navigation shell didn't remount as managers moved between sections, and made sure per-user, frequently-changing data (like warehouse state) was fetched in a way that stayed fresh rather than being cached as if it were static content."

**Result:**
> "The new features shipped without destabilizing the existing platform, and the dashboard felt noticeably faster to navigate because of how the shared layout and data-fetching were structured. It also taught me how to be productive extending someone else's architectural decisions instead of always working from a blank slate."

**Likely follow-ups:**
- "What was the hardest part of working in an existing codebase?" -> Answer honestly: understanding *why* prior decisions were made before changing them, and not assuming inconsistency was accidental.
- "Did you refactor anything, or purely add features?" -> Be honest about scope; if you refactored parts, describe what and why.

### Story 2 - Building the React Native mobile app from scratch and connecting it to the same backend

**Situation:** Clean House needed a mobile app; none existed yet, while the Next.js web platform and its backend were already live.

**Task:** Design and build the React Native app's architecture from scratch, and integrate it with the existing backend so both clients shared consistent business logic and data.

**Action:**
> "I defined the mobile app's architecture and made sure it consumed the same backend the Next.js web app used, rather than duplicating business logic on the client. For the delivery workflow specifically, I implemented real-time updates using WebSockets and Firebase Cloud Messaging, so warehouse and delivery status changes propagated to the mobile app live instead of requiring manual refreshes. I also built barcode scanning workflows for Zebra devices using native Android and DataWedge integration for the warehouse side of the operation."

**Result:**
> "The mobile app and the existing Next.js platform ended up sharing one source of truth for delivery and warehouse data, with real-time updates keeping both in sync, which is exactly the kind of multi-client backend reuse that shapes how I think about splitting logic between a framework's own API routes and a dedicated backend."

**Likely follow-ups:**
- "How did you keep the mobile and web clients consistent?" -> Shared backend, shared contracts/DTOs where applicable, no duplicated business rules on the client.
- "Why WebSockets instead of polling?" -> Lower latency for delivery status changes, fewer wasted requests, and it matches how time-sensitive the data is.

---
