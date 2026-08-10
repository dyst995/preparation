# 06. Part D - Travel2Georgia STAR stories

> Source: `interview-prep/nextjs/05-interview-questions.md`

### Story 3 - Owning architecture and rendering strategy end-to-end

**Situation:** Travel2Georgia needed a complete platform built from nothing - customer-facing website, admin dashboard, and backend services.

**Task:** Design the whole system: database, backend, frontend rendering strategy, and deployment - with no existing codebase or team decisions to inherit.

**Action:**
> "I made deliberate rendering choices per section of the app rather than defaulting everything to one strategy. The public-facing tour/content pages were built to be cached and fast - static or ISR-style, since that content doesn't change per visitor and can tolerate a short revalidation window. The admin dashboard, in contrast, needed fresh, per-session data and full interactivity for editing, so it used dynamic rendering with proper auth gating. I also designed the database schema and backend services to support both sides cleanly, and set up tag-based cache invalidation so that when an admin updated a tour, the public page reflected it quickly without waiting for a timer or doing a full rebuild."

**Result:**
> "The public site stayed fast and cheap to serve because most of it was cacheable, while the admin experience stayed fresh and responsive, and I could reason clearly about which parts of the system needed which rendering strategy because I'd made those calls deliberately rather than inheriting them."

**Likely follow-ups:**
- "How did you decide what should be static vs dynamic?" -> Point to the decision heuristic from chapter 01: is content shared across visitors, does it need to be indexed fast, does it depend on the logged-in user.
- "What would you do differently if you rebuilt it today?" -> Have a genuine answer ready - e.g., "I'd introduce tag-based revalidation earlier instead of relying purely on time-based ISR," or similar honest reflection.

### Story 4 - Docker, Nginx, SSL deployment ownership

**Situation:** Travel2Georgia needed production infrastructure, not just application code - and you were responsible for all of it.

**Task:** Deploy and maintain the platform reliably, including SSL, domain management, and a repeatable deployment process.

**Action:**
> "I configured the Next.js build with standalone output to keep the Docker image lean, wrote a multi-stage Dockerfile so the final runtime image only contained what was needed to actually run the app, and put Nginx in front as a reverse proxy to terminate SSL, handle the HTTP-to-HTTPS redirect, and cache static assets aggressively since Next.js ships immutable, hashed filenames for those. I set up SSL certificates and domain/DNS configuration, and made sure the container would restart automatically if it crashed or the host rebooted."

**Result:**
> "The platform ran reliably in production without needing a managed platform, and going through that process gave me a much deeper, hands-on understanding of what platforms like Vercel actually automate - which makes me faster at diagnosing production issues regardless of where an app is hosted."

**Likely follow-ups:**
- "What would break this setup at higher scale?" -> Single server as a bottleneck/single point of failure; you'd introduce load balancing across multiple app instances, and possibly separate the DB onto its own managed service.
- "How did you handle zero-downtime deploys?" -> Be honest about your actual setup; if you didn't have one, describe how you'd add it (rolling container replacement behind Nginx, health checks before switching traffic).

---
