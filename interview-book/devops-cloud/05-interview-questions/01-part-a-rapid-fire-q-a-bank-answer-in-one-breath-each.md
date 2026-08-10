# 01. Part A - Rapid-fire Q&A bank (answer in one breath each)

> Source: `interview-prep/devops-cloud/05-interview-questions.md`

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
