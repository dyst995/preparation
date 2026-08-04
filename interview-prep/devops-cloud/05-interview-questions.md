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

## Senior-Level Best Practices

### Rapid-fire scenario responses (say these in one breath, cross-chapter)
- "Image is huge and slow to deploy." -> Multi-stage build, alpine base, check `.dockerignore`.
- "502 right after a deploy." -> Readiness race; check backend process status, curl locally, check Nginx error log.
- "A presigned URL leaked in a screenshot." -> Bounded damage if expiry is short; confirm expiry, rotate the object if sensitive and still valid.
- "CI is green but production broke anyway." -> Gap between test coverage and reality; add the missing test/check, consider a canary or staged rollout.
- "Certificate expired unexpectedly." -> Renewal job silently failed; add independent expiry monitoring, don't rely solely on the renewal tool's own logs.
- "Team wants to skip the manual production approval gate 'just this once.'" -> Scope exceptions to a documented emergency process with mandatory follow-up review, not a quiet one-off.
- "Interviewer asks what you'd do differently on Travel2Georgia with unlimited time." -> Add automated post-deploy health checks, centralized logging instead of SSH-tailing files, and a load balancer in front of multiple app instances instead of a single VPS - named honestly as improvements, not implying they were already done.

### Decision framework: answering "how would you make this deployment production-ready" live
Work through, out loud, in this order: (1) is the artifact immutable and traceable (tagged image, not `latest`); (2) is there a rollback path that doesn't require a rebuild; (3) are secrets and access scoped to least privilege, never baked into the image or committed; (4) is TLS/networking hardened at the edge (Nginx config, firewall); (5) is there a health check and basic monitoring so a bad deploy is caught by the system, not by user complaints; (6) is there a manual gate before anything risky goes to production. Naming this checklist out loud, even partially, demonstrates production experience more than any single correct answer.

### Cross-chapter trade-offs table
| Choice A | Choice B | Pick A when | Pick B when |
|---|---|---|---|
| Public S3 bucket | Presigned URL / signed CDN URL | Truly public, static, non-sensitive assets | User-specific or sensitive content |
| Auto-deploy every merge | Manual approval gate before production | Low-stakes internal tool, strong test coverage | Customer-facing, payment-adjacent, or regulated systems |
| Rebuild per environment | Build once, promote everywhere | Almost never - rarely justified | Nearly always the right default beyond a toy project |
| SNS alone | SNS + SQS per consumer | Few, reliable, always-on subscribers (e.g. a Lambda) | Multiple independent consumers needing durability/retry at their own pace |
| Blue-green on one VPS | Rolling deploy across many instances | Single-server setups needing zero downtime | Already horizontally scaled behind a load balancer |

### Common production incidents mapped to root cause (good closing material for any track-summary question)
| Symptom | Likely root cause | First check |
|---|---|---|
| 502 right after a deploy | Backend not ready before traffic was routed to it | Curl the backend directly, bypassing Nginx |
| A presigned URL was used to overwrite another user's file | Client-influenced S3 key with no server-side scoping | Audit key generation for authenticated-user namespacing |
| CI green, production broken | Coverage gap for the actual failure path | Identify and close the specific gap |
| Certificate expired without warning | Renewal job failed silently | Add independent expiry monitoring, don't trust only the renewal tool's logs |
| Disk full, site down | Unrotated logs or Docker image/layer buildup | `df -h`, then investigate the largest consumers |

### Incident-ready production checklist (say this as a checklist in an interview)
- [ ] Immutable, traceable artifacts (commit-SHA-tagged images).
- [ ] A tested rollback path that's a redeploy, not a rebuild.
- [ ] Secrets injected at runtime, never baked into images or committed to git.
- [ ] Least-privilege IAM/bucket policies and non-root containers.
- [ ] TLS hardening (modern ciphers, HSTS once verified, `server_tokens off`) and a default-deny firewall.
- [ ] Automated post-deploy health checks and basic error-rate/latency dashboards.
- [ ] A manual approval gate on production deploys for anything customer-facing or high-stakes.
- [ ] Certificate-expiry and disk-space monitoring that pages someone before it's a live outage.
- [ ] A documented, rehearsed rollback procedure that doesn't require inventing a recovery plan under pressure.
- [ ] A short incident-review habit after anything goes wrong, so the same class of failure gets structurally harder to repeat.

### Worked scenario: a live "design the whole pipeline" combo prompt
**Prompt:** "Walk me through everything that happens from a developer pushing code to a user seeing the change in production, for a small NestJS + Next.js app."
1. **Push triggers CI**: lint, then unit tests, running fast and failing fast on the cheapest checks first.
2. **Build**: a single Docker image per service, tagged with the commit SHA, pushed to a registry - built once, never rebuilt per environment.
3. **Staging deploy**: the same image auto-deploys to staging, where a smoke test or manual check confirms it's healthy.
4. **Production gate**: a manual approval step (or an automated canary check) before the same image is promoted to production.
5. **Production deploy**: Nginx reload (blue-green on a single VPS, or rolling update across instances) to avoid dropped connections, with a health check gating traffic cutover.
6. **Post-deploy verification**: automated error-rate/latency monitoring flags problems within minutes; rollback is redeploying the previous tag if needed.
7. **Close the loop**: mention that database migrations, if any, are handled as their own backward-compatible step in this sequence, not bundled blindly into the same deploy as an incompatible code change.

### Anti-patterns interviewers are trained to notice
- Describing infrastructure only in terms of tools used ("I used Docker, Nginx, S3") with no ability to explain a single trade-off or failure mode for any of them.
- No answer, or a vague answer, to "what's your rollback plan" - a senior candidate should have a crisp, rehearsed answer here regardless of the specific stack.
- Treating "add monitoring" as an afterthought mentioned only when directly asked, rather than baked into the initial design description.
- Claiming Kubernetes/large-scale orchestration expertise with no ability to go one level deeper when probed - it's far stronger to honestly scope what you've actually operated (e.g. Docker Compose on a VPS) and reason correctly about what would change at larger scale.
- Answering every "how would you scale this" question with the same generic buzzwords (Kubernetes, microservices, Redis) regardless of what the actual bottleneck in the scenario is.

### Harder senior follow-up Q&A (drill these until fluent)
1. **"Walk me through what changes about your Travel2Georgia-style deployment if traffic grows 50x overnight."** -> Move from a single VPS to multiple app instances behind a load balancer (or a managed container platform), externalize the database to a managed service with read replicas, put a CDN in front of static assets and possibly S3-backed uploads, add centralized logging/metrics since SSH-ing into one box no longer scales, and introduce a proper staged/canary rollout instead of a single-box blue-green swap. Frame it as "here's what breaks first, and here's the order I'd address it in," not a list of buzzwords.
2. **"Your CI pipeline just started failing on every PR after a dependency update. How do you triage, and how do you prevent this exact class of failure next time?"** -> Check whether the failure is the dependency itself (breaking change, deprecation) or an environment mismatch (CI's cached version vs what's in the lockfile); pin dependency versions and commit lockfiles so "works locally" and "works in CI" can't silently drift; consider a scheduled, isolated job that tests dependency updates before they land on a real feature PR (e.g. a weekly automated update PR reviewed on its own).
3. **"A presigned S3 URL leaked in a support ticket screenshot. What's the actual damage, and how do you respond?"** -> The damage is bounded by the URL's scope (single object, single action - GET or PUT) and its remaining time-to-expiry, which is exactly why short expiry matters - this is the concrete payoff of that earlier design decision. Response: confirm the expiry has already passed or will shortly, rotate/replace the underlying object if it was sensitive and hasn't expired yet, and review whether support tooling should redact such URLs from anything that gets screenshotted in the first place.
4. **"How do you decide what needs a manual approval gate in your pipeline and what can auto-deploy?"** -> Scope it to blast radius and reversibility: low-risk, easily-reversible, well-tested changes (an internal tool, a well-covered backend service with instant rollback) can auto-deploy; anything customer-facing, payment-adjacent, or hard to reverse quickly (a mobile release submitted to app stores, a schema migration) gets a manual gate. The goal is calibrated risk, not blanket caution or blanket speed.
5. **"Describe a production incident you'd expect from a Docker Compose + Nginx + single VPS setup that you would NOT expect from a managed platform, and how you'd mitigate it."** -> Disk filling up from unrotated logs or accumulated Docker images/layers is the classic single-VPS-specific incident - a managed platform usually abstracts storage/log rotation away. Mitigation: `logrotate` configured for app/Nginx logs, a scheduled `docker system prune`, and a disk-usage alert threshold, treated as a standard part of provisioning any new VPS, not a reactive fix after the first outage.
6. **"You're asked to 'just add Kubernetes' to modernize a working single-VPS deployment. How do you respond?"** -> Ask what specific problem Kubernetes is meant to solve here - if it's genuine multi-service scaling, self-healing, or team-wide standardization needs, it can be justified; if the current setup is meeting its actual traffic/reliability requirements, introducing Kubernetes purely for resume-driven or trend-driven reasons adds real operational complexity (a control plane, RBAC, networking, ongoing cluster maintenance) without a corresponding proven need. A senior answer names the actual trigger that would justify the migration, rather than treating it as automatically "more modern = better."
7. **"Give a 60-second answer to 'what does production-ready actually mean to you.'"** -> Traceable, immutable artifacts with a fast rollback path; secrets and access scoped to least privilege, never committed or baked in; TLS and network hardening at the edge; automated health checks and basic error/latency monitoring so problems surface via dashboards, not support tickets; a manual gate before anything customer-facing or hard to reverse; and a rehearsed, documented incident response rather than an improvised one. Frame it as a checklist you've actually applied (Travel2Georgia), not a definition memorized for the interview.

---

## Mastery checklist

- [ ] I can answer all 24 rapid-fire questions in Part A without hesitation.
- [ ] I can deliver the Travel2Georgia deployment story fluently in under 2 minutes, including follow-ups.
- [ ] I can deliver the GitLab Runner + Fastlane CI/CD story fluently in under 2 minutes, including follow-ups.
- [ ] I can handle all 4 live troubleshooting drills with a clear stated method, not just a guessed answer.
- [ ] I can whiteboard a full small-app deployment (Part D) in under 3 minutes, unprompted.
