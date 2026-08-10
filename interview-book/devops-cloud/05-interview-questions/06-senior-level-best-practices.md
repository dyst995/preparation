# 06. Senior-Level Best Practices

> Source: `interview-prep/devops-cloud/05-interview-questions.md`

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
