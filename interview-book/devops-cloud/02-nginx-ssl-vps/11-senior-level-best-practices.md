# 11. Senior-Level Best Practices

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

### Rapid-fire scenario responses (say these in one breath)
- "API routes return 404 for paths that definitely exist on the backend." -> Check the `proxy_pass` trailing slash - it's likely stripping or preserving the location prefix unexpectedly.
- "Site works over HTTP but HTTPS shows a certificate error." -> Check `ssl_certificate`/`ssl_certificate_key` paths and that Certbot's renewal actually completed; verify with `openssl s_client` or a browser cert inspector.
- "Backend logs show correct requests but always from the same internal IP." -> Missing `X-Real-IP`/`X-Forwarded-For` headers in the proxy config; the backend is seeing Nginx's IP, not the client's.
- "502 errors started right after a deploy." -> Likely a readiness race - the new backend process hadn't finished starting before Nginx began routing to it.
- "Disk usage alert fires on the VPS." -> Check `/var/log` and Docker image/layer buildup first; these are the most common culprits, not application data.

### Decision framework: rolling deploy vs blue-green vs simple restart
- Single VPS, low traffic, brief downtime tolerated -> simple `docker compose up -d --build` or systemd restart is honestly fine; state this trade-off explicitly rather than over-engineering for traffic you don't have.
- Single VPS, zero-downtime required -> blue-green on one box: run the new version on a second port, switch Nginx's `upstream` target (or swap a symlinked config and reload), verify health, then stop the old version - Nginx's `reload` (not `restart`) gracefully finishes in-flight connections on the old config while picking up the new one.
- Multi-instance/load-balanced -> rolling deploy, taking instances out of the upstream pool one at a time, health-checking before returning each to rotation.
- Any of the above needs an automated health check gate before traffic cuts over - "it deployed without an error" is not the same as "it's actually healthy."

### Nginx hardening checklist
- [ ] TLS: disable old protocol versions (TLS 1.0/1.1), use a modern cipher suite list, and enable session resumption for performance.
- [ ] `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;` (HSTS) once you're confident HTTPS is fully working - it's a one-way commitment for the max-age duration.
- [ ] Hide version info: `server_tokens off;` so error pages/headers don't advertise the exact Nginx version to attackers.
- [ ] Rate limiting on sensitive endpoints (login, password reset) via `limit_req_zone`/`limit_req` to blunt brute-force and basic abuse.
- [ ] Explicit `client_max_body_size` set intentionally (not left at the tiny default) for any upload endpoint, and kept tight everywhere else to limit abuse via oversized request bodies.
- [ ] Security headers beyond HSTS as appropriate: `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors` via CSP, depending on what the app actually needs.
- [ ] Firewall + fail2ban (or equivalent) watching Nginx's access log for repeated auth failures/scan patterns, not just a static ufw allow-list.

### Blue-green / rollback checklist for a single-VPS deploy
- [ ] The new version starts on a different port/container name while the old one is still serving traffic.
- [ ] A health check endpoint is hit against the new version directly (bypassing Nginx) before it's cut into rotation.
- [ ] The Nginx config change to point at the new version is a `reload` (graceful, no dropped connections), never a hard `restart`.
- [ ] The old version stays up (not removed) for a defined window after cutover, so rollback is "point Nginx back at the old upstream and reload," not "redeploy from scratch."
- [ ] Rollback is a rehearsed, documented command sequence, not something invented live during an incident.

### Worked scenario: a real "the site is down" incident, start to finish
1. **First 30 seconds**: check if it's everyone or just you - `curl -I https://the-domain.com` from a different network (phone data, not the office wifi) to rule out a local DNS/network issue.
2. **Check Nginx itself**: `systemctl status nginx` - is the process even running, or did a bad config reload kill it?
3. **Check the backend directly**: `curl http://127.0.0.1:3000/health` on the VPS, bypassing Nginx entirely, to isolate which layer is actually broken.
4. **Check the error log**: `tail -100 /var/log/nginx/error.log` for the specific failure - connection refused, timeout, or a config syntax error from the last reload.
5. **Check recent changes**: `git log` on the config repo, or ask "did anyone deploy or touch DNS/certs in the last hour" - most incidents correlate with a recent change.
6. **Restore service first, investigate root cause second**: roll back the last deploy or config change if it's the obvious culprit, confirm the site is back, then dig into why, rather than debugging live while users are down.
7. **Write it up afterward**: a short incident note (what broke, why, how it was caught, what would catch it faster next time) turns one bad hour into a permanently better system.

### Anti-patterns and failure modes
| Anti-pattern | Failure mode | Fix |
|---|---|---|
| `systemctl restart nginx` used for config changes | Brief full outage and dropped in-flight connections on every deploy | Always `reload` for config changes; `restart` only when truly necessary |
| No rate limiting on login/auth endpoints | Trivial to brute-force or abuse at scale | `limit_req_zone` scoped to sensitive paths |
| Certificate auto-renewal set up once and never monitored | Silent renewal failure discovered only when the site is already down with an expired cert | Alerting on certificate expiry, independent of Certbot's own renewal logs |
| Treating a 502 as "just restart the backend" without checking why | Masks the real root cause (crash loop, bad deploy, resource exhaustion), guarantees a repeat | Follow the diagnostic method: check process status, curl locally, check logs, THEN act |
| One shared Nginx config file hand-edited directly on the server | No review, no history, "who changed this and why" is unanswerable during an incident | Config lives in git, deployed via the same CI/CD pipeline as the app |

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| 502 right after deploy | Backend not ready before Nginx routed to it | Curl the backend directly on localhost |
| API routes 404 that should exist | `proxy_pass` trailing slash stripping/preserving the prefix unexpectedly | Compare the exact backend route to what Nginx is forwarding |
| Site suddenly serves an expired cert | Certbot renewal silently failed | `certbot renew --dry-run`, check the systemd timer status |
| Backend logs show the wrong client IP | Missing `X-Real-IP`/`X-Forwarded-For` headers | Check the `location` block's `proxy_set_header` lines |
| VPS suddenly runs out of disk | Unrotated logs or accumulated Docker layers | `df -h`, then `du -sh` on log/Docker directories |

### Observability for the edge/proxy layer
- Track request rate, error rate (4xx/5xx), and latency percentiles from Nginx's access log (or an APM agent) - this is your earliest signal of both attacks and backend problems.
- Alert on certificate expiry proactively (a separate check hitting the live endpoint's TLS cert, not just trusting Certbot's internal renewal logs) - the whole point is catching a *silent* renewal failure.
- Watch for a rising rate of `connect() failed` errors in the Nginx error log specifically - a leading indicator of backend instability before it fully manifests as widespread 502s.
- Log and alert on rate-limit rejections - a spike often means either an attack or a legitimate client misbehaving (e.g. a buggy retry loop), and you want to know which.

### Scalability and team practices
- Keep Nginx config in version control, deployed the same way as application code, so changes are reviewable and diffable - never a config that "lives on the server" and gets manually edited during incidents.
- Write down the rollback procedure and actually rehearse it (a "game day") before you need it under real pressure at 2am.
- As traffic grows past what one VPS handles comfortably, plan the move to a load balancer + multiple app instances before you're forced into it during an outage - capacity planning is a scheduled task, not a reaction.
- Make cert-expiry and disk-space monitoring part of the standard "new environment" setup checklist so it's never accidentally skipped for a new domain/VPS.

### Senior follow-up Q&A
1. **How do you achieve zero-downtime deploys on a single VPS without a full orchestrator like Kubernetes?** -> Run the new container/process on a different port, health-check it directly, update the Nginx upstream/config to point at the new port, `nginx -s reload` (graceful, doesn't drop in-flight connections), verify, then stop the old process after a safety window. This is blue-green on a single box - no orchestrator required, just discipline about not doing a hard restart.
2. **Your rate limiting is blocking legitimate mobile app traffic during a usage spike. How do you diagnose and fix this live?** -> Check the Nginx access log for the actual pattern (is it truly abusive traffic or a legitimate burst - e.g. many users opening the app at once after a push notification), check what key the rate limit is scoped by (per-IP can over-block users behind shared/carrier NAT), and adjust the limit's rate/burst parameters or scope (e.g. per-user-token instead of per-IP) rather than just disabling rate limiting entirely.
3. **How would you add HSTS to a production domain safely, given it's hard to undo?** -> Verify HTTPS works flawlessly across all subdomains and edge cases first (including any subdomain that might be added later, since `includeSubDomains` applies broadly), start with a shorter `max-age` to test in a lower-risk window, then increase it once confident - because once a browser caches a long HSTS header, users can't reach the site over plain HTTP even if something breaks, for the full duration of that max-age.
4. **A teammate suggests putting the SSL private key directly in the Nginx config file for "simplicity." What's your response?** -> Private keys should live as separate files with restrictive filesystem permissions (owned by root, mode 600), referenced by path in the config (`ssl_certificate_key`), not embedded inline - this keeps the key out of anything that might get copy-pasted, logged, or accidentally committed, and matches how Certbot manages certs by default for a reason.
5. **How do you explain the trade-off of terminating TLS at Nginx vs at a CDN/load balancer in front of it?** -> Terminating at Nginx keeps full control and visibility on your own box and avoids depending on a third party for TLS, but means you own certificate management and DDoS/traffic absorption yourself. Terminating at a CDN/managed load balancer offloads cert management and gives you edge caching and DDoS protection "for free," at the cost of an extra hop, potential vendor lock-in, and needing to trust and configure that layer correctly (e.g. forwarding real client IPs downstream).
6. **How would you monitor for a certificate renewal failure before it causes an outage, independent of trusting Certbot's own logs?** -> An external check (a scheduled job or third-party uptime monitor) that connects to the live domain over TLS and checks the actual certificate's expiry date, alerting when it's within some safety window (e.g. 14 days) - this catches the failure mode where Certbot's renewal silently broke (DNS change, firewall change, disabled timer) without relying on the same system that failed to also report its own failure.
7. **What's the very first command you run when someone says "the site is down," before looking at any dashboard?** -> `curl -I` against the live URL from a network you're confident isn't the problem (mobile data, not the same office/VPN that might itself be having an issue) - this immediately tells you if it's truly down for everyone, a DNS/network issue specific to your vantage point, or actually fine and the reporter has a local problem, and it takes five seconds before touching the server at all.

---
