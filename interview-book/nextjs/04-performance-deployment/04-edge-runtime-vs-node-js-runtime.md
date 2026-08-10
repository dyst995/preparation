# 04. Edge runtime vs Node.js runtime

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Topics to learn

- [ ] `export const runtime = "edge" | "nodejs"` on pages, layouts, and Route Handlers
- [ ] Edge runtime: runs on a lightweight V8-isolate-based runtime (not full Node.js), extremely fast cold starts, deployed geographically closer to users on platforms that support it, but with a restricted API surface (no arbitrary native Node modules, limited/no filesystem access, size limits)
- [ ] Node.js runtime: full Node.js API access, all npm packages work, higher cold-start cost on serverless platforms, no built-in geographic distribution
- [ ] Middleware always runs on the Edge runtime (a deliberate constraint, not a choice)
- [ ] When self-hosting on your own server/Docker container (like Travel2Georgia), the Edge-vs-Node distinction matters less for latency/geo-distribution since you're running one Node.js process anyway - the distinction matters most on serverless/multi-region platforms
- [ ] Decision heuristic: Edge for latency-sensitive, lightweight logic (auth checks, redirects, header rewriting, simple personalization); Node.js for anything needing full library support, heavier compute, or direct DB drivers that assume a Node environment

### Interview question

**Q: When would you choose the Edge runtime for a Route Handler?**

> "If it's lightweight and latency-sensitive - a simple auth check, a redirect, geolocation-based content - and doesn't need a Node-specific library or heavy compute. If it needs a full ORM/DB client with native bindings, file system access, or a large npm dependency that assumes Node, I keep it on the Node.js runtime. On a self-hosted setup like Travel2Georgia, running everything as one Node.js process behind Nginx, the Edge/Node distinction is more about API surface constraints than about the geographic-latency benefit you'd get from an edge network - since it's one server in one region either way."

---
