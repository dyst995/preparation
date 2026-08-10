# 02. Part B - Deployment story drills (STAR format, rehearse out loud)

> Source: `interview-prep/devops-cloud/05-interview-questions.md`

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
