# 04. Part D - "Whiteboard the deployment" drill

> Source: `interview-prep/devops-cloud/05-interview-questions.md`

**Prompt:** "You're building a small full-stack app - a Next.js frontend, a NestJS backend, and a Postgres database. Walk me through how you'd deploy this to production."

**A strong structured answer:**

1. "I'd containerize each piece - frontend, backend, and use a managed or containerized Postgres instance - with a Dockerfile per service, using multi-stage builds to keep images small."
2. "I'd use Docker Compose (or a small orchestrator, depending on scale expectations) to run them together, with Postgres data on a named volume so it persists across container recreation."
3. "Nginx sits in front as a reverse proxy: the frontend on `/`, the API proxied under `/api`, with proper forwarded headers so the backend knows the real client IP and original protocol."
4. "SSL via Let's Encrypt/Certbot, terminated at Nginx, with automatic renewal, and the domain's DNS A record pointed at the server."
5. "For CI/CD: a pipeline that lints, tests, builds a tagged Docker image per service, and deploys - ideally the exact same image getting promoted from staging to production, with a manual approval gate before production."
6. "For secrets: environment variables injected at deploy time / CI variables, never committed or baked into images."
7. "For day-2 concerns: basic firewall rules, service auto-restart policies, log rotation, and at least basic uptime/cert-expiry monitoring."

This structured 7-point answer mirrors almost exactly what you actually did on Travel2Georgia - which is why rehearsing it is so valuable: it's not theoretical, it's your own real experience organized into a clean narrative.

---
