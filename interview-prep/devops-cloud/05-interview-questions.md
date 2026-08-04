05 - Interview Question Bank & Deployment Story Drills

Goal: A single, dense practice chapter - a rapid-fire Q&A bank across Docker/Nginx/SSL/AWS/CI, plus STAR-style deployment story drills built directly from your CV (Travel2Georgia, GitLab Runner + Fastlane pipelines) that you should be able to deliver fluently and specifically in an interview.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Answer rapid-fire questions across all of Docker, Nginx/SSL/VPS, AWS S3/SNS, and Git/CI without hesitating.
2. Deliver a structured, specific STAR story about deploying Travel2Georgia end to end.
3. Deliver a structured, specific STAR story about building the GitLab Runner + Fastlane mobile CI/CD pipeline.
4. Handle live troubleshooting-style prompts ("your site just went down, walk me through what you'd check") with a clear method instead of panic.
5. Handle "whiteboard the deployment" style system design-lite prompts for a small full-stack app.

---

## Part A - Rapid-fire Q&A bank (answer in one breath each)

### Docker
1. Image vs container? -> immutable layered template vs running instance with a writable layer.
2. Why does Dockerfile instruction order matter? -> layer caching; expensive/rare-changing steps first.
3. What's a multi-stage build for? -> separate build tooling from runtime, smaller/safer final image.
4. Why never bake secrets into an image layer? -> layers are immutable and inspectable even after a later "delete."
5. Named volume vs bind mount? -> Docker-managed persistent storage vs a specific host path (dev convenience).
6. depends_on vs healthcheck? -> depends_on waits for container start only; healthcheck actually verifies readiness.

### Nginx / SSL / VPS
7. What is a reverse proxy for? -> single public entry point handling routing, TLS termination, static assets, hides internal topology.
8. proxy_pass trailing slash behavior? -> without it, the location prefix is forwarded; with it, the prefix is stripped.
9. What does Let's Encrypt/Certbot give you, and how often must you renew? -> free automated TLS certs, valid 90 days, auto-renewed via a scheduled job.
10. A record vs CNAME? -> domain-to-IP vs domain-to-domain alias.
11. 502 vs 504? -> no/invalid response from upstream vs upstream too slow (timeout).
12. First 3 things you check on a 502? -> is the backend process running, does curling it locally work, what does the Nginx error log say.

### AWS S3 / SNS
13. Are S3 buckets public by default? -> no, private by default; public access is explicit.
14. What's a presigned URL for? -> temporary, scoped, signed access (GET/PUT) without the client needing AWS credentials.
15. Why keep presigned URL expiry short? -> it's a bearer credential; short expiry limits leak exposure.
16. SNS vs SQS in one line? -> push-based pub/sub fan-out vs durable, pull-based point-to-point queue.
17. When would you combine SNS and SQS? -> fan-out to multiple independent, durable, retryable consumers via SQS queues subscribed to one SNS topic.

### Git / CI
18. Rebase vs merge? -> linear rewritten history (own unpublished branch) vs preserved history with a merge commit.
19. Revert vs reset? -> new undo commit (safe, shared history) vs rewriting the branch pointer (local/unpublished only).
20. What's cherry-pick for? -> applying one specific commit onto another branch, e.g. porting a hotfix.
21. Stages vs jobs in GitLab CI? -> stages define order; jobs within a stage run in parallel.
22. Why did your iOS CI jobs need a specific runner? -> iOS builds require macOS + Xcode; routed via runner tags.
23. What does Fastlane's match do? -> syncs iOS signing certs/provisioning profiles across the team via an encrypted shared repo.
24. Build once, deploy everywhere - why? -> guarantees what was tested is exactly what's deployed; avoids per-environment build drift.

---

## Part B - Deployment story drills (STAR format, rehearse out loud)

### Story 1: Travel2Georgia - full-stack production deployment

**Use this for:** "Tell me about a time you deployed/owned infrastructure for a project," "walk me through a deployment you're proud of," "what's your DevOps experience."

**Situation:** "I built Travel2Georgia end to end - a customer-facing website, an admin dashboard, and backend services - as a freelance project, meaning I owned the entire lifecycle, not just the code."

**Task:** "Beyond writing the application, I was responsible for designing the database, choosing the production infrastructure, and actually deploying and maintaining it, since there was no separate ops team."

**Action:** "I containerized each part of the platform with Docker - the frontend, the backend API, and the database - and used Docker Compose to run them together on a single VPS. I put Nginx in front as a reverse proxy, routing the customer-facing domain to the frontend and proxying `/api` requests to the backend, while keeping the actual app processes off the public internet entirely. I set up SSL with Let's Encrypt through Certbot, configured the domain's DNS records to point at the VPS, and made sure certificate renewal was automated rather than something I'd have to remember every few months. I also set up basic VPS hardening - a firewall allowing only SSH, 80, and 443 - and made sure services would restart automatically if they crashed or the server rebooted."

**Result:** "The result was a fully production-grade deployment - HTTPS, proper routing, automated cert renewal, and resilient process management - that I could maintain and update independently, end to end, without relying on a managed PaaS or a separate infrastructure team."

**Likely follow-ups and how to handle them:**
- "What would you do differently at scale?" -> "At real scale I'd move toward multiple VPS instances behind a load balancer or a managed container platform, externalize the database to a managed service for easier backups/failover, and add centralized logging/monitoring rather than SSH-ing in to tail logs."
- "How did you handle zero-downtime deploys?" -> be honest about your actual approach; if it was a simple `docker compose up -d --build` with brief downtime, say so and describe how you'd improve it (blue-green via two Nginx upstream targets, or a proper orchestrator).
- "What if the SSL cert failed to renew?" -> "Certbot's renewal is automated via a scheduled job, but I'd also want monitoring/alerting on certificate expiry as a safety net, since a silent renewal failure is exactly the kind of thing that only gets noticed when it's already broken."

### Story 2: GitLab Runner + Fastlane mobile CI/CD pipeline

**Use this for:** "Tell me about CI/CD experience," "how have you automated releases," "what's an infrastructure/tooling improvement you're proud of."

**Situation:** "At Orient Logic, and again on the Online School app, mobile releases for Android and iOS were being built and signed manually before every release candidate - slow, error-prone, and dependent on whoever happened to have the right certificates and Xcode/Android setup locally."

**Task:** "I was responsible for building proper CI/CD pipelines to automate building, signing, and distributing release candidates for both platforms."

**Action:** "I set up GitLab Runner - including a macOS-capable runner specifically for iOS builds, since that requires Xcode - and wrote Fastlane lanes for each platform. For iOS, `match` synced our signing certificates and provisioning profiles from a shared encrypted repo so no one needed to manually manage `.p12` files, `gym` built and signed the binary, and `pilot` pushed it to TestFlight. For Android, the Gradle action built the app bundle and `supply` pushed it to the Play Console's internal track. I wired these lanes into `.gitlab-ci.yml` so pushing to a release branch triggered the whole pipeline automatically, with the right jobs tagged to run on the right runners."

**Result:** "This turned a manual, error-prone, single-person-dependent release process into something any team member could trigger reliably from a release branch, which mattered a lot given we were also actively working on stability - like the crash rate reduction work on the Online School app - since faster, safer releases meant we could ship fixes to production faster."

**Likely follow-ups and how to handle them:**
- "What happens if a build fails signing?" -> describe how match's readonly mode + clear Fastlane error output made it obvious whether it was a cert/profile issue vs a build issue, and that you'd fix it in the shared match repo, not by hand-patching one machine.
- "How did you handle different environments (staging vs production apps)?" -> describe using different lanes/schemes/bundle IDs per environment if applicable, or be honest if it was one environment and describe how you'd extend it.
- "Did this pipeline run tests too?" -> be honest about the actual scope; if it was focused on build+sign+distribute, say that clearly and describe how you'd extend it to include a test stage before the build stage.

---

## Part C - Live troubleshooting drills (say your method out loud, not just the answer)

### Drill 1: "The production site is returning a 502. Walk me through what you'd do."

1. Check if the backend process/container is actually running (`systemctl status` / `docker ps`).
2. `curl` the backend directly on localhost, bypassing Nginx, to isolate whether it's an Nginx or backend issue.
3. Check Nginx's error log for the specific failure (`connect() failed` vs timeout).
4. Check whether this followed a recent deploy (readiness race, wrong port, bad config push).
5. Restart/roll back the specific failing piece once the cause is identified - not before.

### Drill 2: "Your SSL certificate expired unexpectedly. What happened and how do you prevent it next time?"

1. Check Certbot's renewal logs/timer status (`systemctl status certbot.timer`, `journalctl -u certbot`).
2. Common causes: the renewal cron/timer was disabled or failed silently, DNS changed and broke the HTTP validation challenge, or firewall/Nginx config changes blocked the validation path.
3. Manually renew (`certbot renew`) to restore service immediately.
4. Prevention: add uptime/certificate-expiry monitoring/alerting so a silent renewal failure surfaces before the cert actually expires, not after.

### Drill 3: "Disk is full on the VPS and the site is down. What do you check?"

1. `df -h` to confirm disk usage and which mount is full.
2. `du -sh /var/log/* /var/lib/docker/* | sort -rh` (or similar) to find what's consuming space - very often unrotated logs or old Docker images/layers.
3. Clear/rotate the offending logs (`docker system prune`, configure `logrotate`, or reduce log verbosity) to restore service.
4. Prevention: set up `logrotate` for app/Nginx logs, prune unused Docker images regularly, add a disk-usage alert threshold.

### Drill 4: "A mobile release build is failing in CI but works locally. What do you check?"

1. Compare environment: CI runner's Xcode/Android SDK/tooling versions vs local machine.
2. Check signing: does the CI runner have access to the same certificates/provisioning profiles via `match`, or is it a permissions/credentials issue specific to CI?
3. Check for hardcoded local paths/environment assumptions that don't hold on a clean CI runner.
4. Check CI job logs for the actual first failure, not just the final error - CI logs are often long and the root cause is earlier than the final reported failure.

---

## Part D - "Whiteboard the deployment" drill

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

## Senior red flags / green flags (whole-track summary)

### Green flags
- Concrete, specific stories (Travel2Georgia, GitLab Runner + Fastlane) instead of generic DevOps trivia.
- A repeatable troubleshooting method for any "X is broken, what do you do" prompt.
- Talking about prevention/monitoring, not just the fix, after a troubleshooting scenario.
- Being honest about the actual scope of what you built rather than overclaiming (e.g. admitting a pipeline didn't include automated tests yet, and describing how you'd add them).

### Red flags
- Vague "I've used Docker" with no ability to go one level deeper when asked.
- No troubleshooting method - jumping straight to "I'd restart the server."
- Claiming deep Kubernetes/large-scale orchestration expertise you haven't actually practiced (if asked, it's fine to say "I've deployed with Docker Compose on a single VPS; I understand the concepts behind Kubernetes/ECS but haven't operated them in production").
- Not connecting any answer back to a real project - sounding like you memorized this chapter rather than lived it.

---

## Mastery checklist

- [ ] I can answer all 24 rapid-fire questions in Part A without hesitation.
- [ ] I can deliver the Travel2Georgia deployment story fluently in under 2 minutes, including follow-ups.
- [ ] I can deliver the GitLab Runner + Fastlane CI/CD story fluently in under 2 minutes, including follow-ups.
- [ ] I can handle all 4 live troubleshooting drills with a clear stated method, not just a guessed answer.
- [ ] I can whiteboard a full small-app deployment (Part D) in under 3 minutes, unprompted.
