02 - Nginx, SSL & VPS

Goal: Explain reverse proxying, write a real Nginx config that serves a static frontend and proxies API traffic, set up SSL with Let's Encrypt, and talk through domains/DNS and basic VPS hardening - this is the theory behind your most concrete DevOps story: Travel2Georgia.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain what a reverse proxy is and why you'd put one in front of your app instead of exposing app servers directly.
2. Read and write an Nginx config: `server` blocks, `location` blocks, `proxy_pass`, `upstream`.
3. Configure Nginx to serve a static frontend and proxy `/api` to a backend service on the same box.
4. Explain SSL/TLS termination, and set up Let's Encrypt/Certbot for free, auto-renewing certificates.
5. Explain domains and DNS records (A, CNAME, TXT) well enough to talk through pointing a domain at a VPS.
6. Describe basic VPS hardening and operations: firewall, systemd services, log locations.
7. Diagnose the most common Nginx production symptom: a 502 Bad Gateway.

---

## 1. What a reverse proxy is, and why

### Topics to learn
- [ ] Forward proxy vs reverse proxy (client-side vs server-side)
- [ ] Reverse proxy responsibilities: routing, TLS termination, load balancing, caching, compression, rate limiting
- [ ] Why you don't expose Node.js/Next.js dev servers directly to the internet
- [ ] Single entry point for multiple backend services on one VPS

### Mental model

A **forward proxy** sits in front of clients and makes requests on their behalf (e.g. a corporate proxy hiding internal users from the internet). A **reverse proxy** sits in front of your servers and makes them look like a single service to the outside world - clients only ever talk to the reverse proxy; it decides where the request actually goes.

On a single VPS running Travel2Georgia's customer website, admin dashboard, and backend API, Nginx as a reverse proxy is what lets all three live behind one IP address on ports 80/443, routed by hostname and path, while the actual app processes (Next.js on 3000, NestJS on 3001, admin panel on 3002, for example) never need to be exposed to the public internet directly.

### Why not expose Node.js directly

- Node.js HTTP servers are capable but not hardened/optimized the way Nginx is for handling huge numbers of concurrent slow/malicious connections (slow clients, TLS handshakes, connection floods).
- You'd need to implement TLS termination, static file serving/compression, and request buffering yourself in application code.
- A single Nginx instance in front lets you add/rotate/scale backend processes without changing what's publicly exposed.

### Model spoken answer

"A reverse proxy sits in front of your actual application servers and is the only thing exposed to the internet - clients talk to it, and it decides which internal service handles the request. On Travel2Georgia I used Nginx as that single entry point in front of the customer site, the admin dashboard, and the backend API, all running as separate processes on the same VPS, so only Nginx needed ports 80 and 443 open, and it handled TLS termination, routing by path, and serving static assets directly instead of proxying everything through Node."

---

## 2. Nginx config anatomy

### Topics to learn
- [ ] `http` block (global), `server` block (a virtual host), `location` block (path routing)
- [ ] `listen`, `server_name`
- [ ] `proxy_pass` and the trailing-slash gotcha
- [ ] `proxy_set_header` (forwarding real client IP, host, protocol)
- [ ] `root` / `try_files` for static file serving and SPA fallback
- [ ] `upstream` block for multiple backend instances (load balancing)
- [ ] `gzip`/`brotli` compression basics

### Full example: static frontend + API proxy (Travel2Georgia shape)

```nginx
# /etc/nginx/conf.d/travel2georgia.conf

upstream backend_api {
    server 127.0.0.1:3001;
    # could add more `server` lines here for simple round-robin load balancing
}

server {
    listen 80;
    server_name travel2georgia.ge www.travel2georgia.ge;

    # Redirect all plain HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name travel2georgia.ge www.travel2georgia.ge;

    ssl_certificate     /etc/letsencrypt/live/travel2georgia.ge/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/travel2georgia.ge/privkey.pem;

    # Static frontend (Next.js export or reverse-proxied to the Next.js server)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes proxied to the NestJS backend
    location /api/ {
        proxy_pass http://backend_api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support if the backend uses Socket.IO/WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static assets served directly by Nginx for speed, bypassing Node entirely
    location /static/ {
        alias /var/www/travel2georgia/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### The `proxy_pass` trailing slash gotcha (very commonly tested)

```nginx
# WITHOUT trailing slash on proxy_pass: the matched location prefix (/api/)
# is preserved and appended - request to /api/users -> backend sees /api/users
location /api/ {
    proxy_pass http://backend_api;
}

# WITH trailing slash on proxy_pass: the /api/ prefix is stripped before forwarding
# request to /api/users -> backend sees /users
location /api/ {
    proxy_pass http://backend_api/;
}
```

This single trailing slash difference is one of the most common real-world Nginx bugs - "why is my API getting 404s that don't match its actual routes" is very often this. Know it cold.

### Essential proxy headers, and why each matters

| Header | Why |
|---|---|
| `Host` | so the backend sees the original hostname, not `127.0.0.1` |
| `X-Real-IP` | preserves the actual client IP for logging/rate-limiting at the app level |
| `X-Forwarded-For` | chain of proxy IPs, standard convention many frameworks read |
| `X-Forwarded-Proto` | tells the backend the original request was HTTPS, even though Nginx talks to it over plain HTTP internally - important for frameworks that generate absolute URLs or enforce secure cookies |

### Model spoken answer

"An Nginx server block is a virtual host, and location blocks route by path within it. The gotcha I always double check is the trailing slash on proxy_pass - with it, the matched location prefix gets stripped before forwarding to the backend; without it, the prefix is preserved. I also always forward Host, X-Real-IP, X-Forwarded-For, and X-Forwarded-Proto, because otherwise the backend loses the real client IP and thinks every request came in over plain HTTP even when TLS was terminated at Nginx."

---

## 3. SSL/TLS with Let's Encrypt/Certbot

### Topics to learn
- [ ] TLS termination at the reverse proxy vs at the app
- [ ] Certificate, private key, chain/fullchain files
- [ ] Let's Encrypt as a free, automated certificate authority
- [ ] Certbot's Nginx plugin (auto-edits Nginx config) vs webroot/manual mode
- [ ] Auto-renewal (certs are valid 90 days; renewal should be automated via cron/systemd timer)
- [ ] HTTP -> HTTPS redirect
- [ ] HSTS header awareness

### Setting up Certbot (typical VPS flow)

```bash
# Install certbot with the Nginx plugin
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain and auto-configure the certificate for your domain(s)
sudo certbot --nginx -d travel2georgia.ge -d www.travel2georgia.ge

# Certbot edits the Nginx config to add the ssl_certificate lines and
# sets up an HTTP -> HTTPS redirect automatically in most cases.

# Test the auto-renewal process without actually renewing
sudo certbot renew --dry-run
```

Certbot installs a systemd timer (or cron job, depending on the OS/install method) that runs `certbot renew` roughly twice a day, but only actually renews certificates within about 30 days of expiry - so most days it's a no-op. Since certs are valid for 90 days, this ensures they're renewed with plenty of margin without manual intervention.

### TLS termination point

Terminating TLS at Nginx (rather than at each app process) means:
- Only one place manages certificates.
- Backend services communicate over plain HTTP internally (fine, since it's within the same VPS/private network) which simplifies backend code (no cert handling in NestJS/Next.js).
- `X-Forwarded-Proto: https` tells the backend the original request was secure, even though the internal hop is HTTP.

### Model spoken answer

"I terminate TLS at Nginx using free Let's Encrypt certificates via Certbot's Nginx plugin, which edits the server block automatically and sets up the HTTP-to-HTTPS redirect. Certbot also installs an automatic renewal job, since Let's Encrypt certs are only valid for 90 days - I always verify that with `certbot renew --dry-run` right after setup so I'm not surprised by an expired cert three months later. Terminating at Nginx means the backend services can stay simple and just speak plain HTTP internally, while still knowing the original request was HTTPS via the X-Forwarded-Proto header."

---

## 4. Domains and DNS basics

### Topics to learn
- [ ] A record (domain -> IPv4 address)
- [ ] AAAA record (domain -> IPv6 address)
- [ ] CNAME record (alias to another domain name)
- [ ] TXT record (verification, SPF/DKIM for email, Let's Encrypt DNS challenge)
- [ ] TTL and propagation delay
- [ ] Pointing a domain at a VPS: registrar -> DNS provider -> A record -> server IP

### Typical setup for pointing a domain at a VPS

1. Buy/own the domain (registrar, e.g. Namecheap, GoDaddy, a local Georgian registrar).
2. Set nameservers to your DNS provider (could be the registrar itself, or Cloudflare, Route 53, etc.).
3. Add an **A record**: `travel2georgia.ge -> <VPS public IP>`.
4. Add a **CNAME** for `www`: `www.travel2georgia.ge -> travel2georgia.ge` (or another A record, depending on provider support for apex CNAMEs).
5. Wait for propagation (minutes to ~48 hours depending on TTL and caching resolvers).
6. Run Certbot once DNS resolves correctly, since Certbot's HTTP challenge needs the domain to actually reach your server.

### Model spoken answer

"Pointing a domain at a VPS is an A record mapping the domain to the server's public IP, plus usually a CNAME for the www subdomain. DNS changes take time to propagate depending on TTL, so I always verify resolution with something like `dig` or `nslookup` before running Certbot, since its HTTP validation challenge needs the domain to actually resolve to my server first."

---

## 5. VPS basics: systemd, firewall, logs

### Topics to learn
- [ ] Running app processes as systemd services (auto-restart, boot-start, log integration via journalctl)
- [ ] Firewall basics (`ufw`): default deny, explicitly allow 22/80/443
- [ ] SSH key-based auth over password auth
- [ ] Common log locations: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`, `journalctl -u <service>`
- [ ] Disk space monitoring (logs filling up disk is a very real, very common production incident)

### Example systemd service (if not using Docker/compose for a process)

```ini
# /etc/systemd/system/travel2georgia-api.service
[Unit]
Description=Travel2Georgia backend API
After=network.target

[Service]
ExecStart=/usr/bin/node /var/www/travel2georgia/backend/dist/main.js
Restart=always
User=deploy
Environment=NODE_ENV=production
WorkingDirectory=/var/www/travel2georgia/backend

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable travel2georgia-api
sudo systemctl start travel2georgia-api
sudo journalctl -u travel2georgia-api -f   # tail logs live
```

### Basic firewall setup

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH   # or `ufw allow 22`
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Model spoken answer

"On a VPS I run application processes either via Docker Compose with restart policies, or as systemd services with Restart=always so they come back up automatically after a crash or reboot. I lock down the firewall with ufw to a default-deny stance, only opening SSH, 80, and 443. For diagnosing issues I check Nginx's access and error logs and journalctl for the app service, and I keep an eye on disk usage since unrotated logs filling the disk is a surprisingly common way to take a whole VPS down."

---

## 6. Diagnosing a 502 Bad Gateway (the single most common real-world Nginx symptom)

### Topics to learn
- [ ] 502 means Nginx successfully received the request but got an invalid/no response from the upstream
- [ ] Common causes: backend process crashed/not running, wrong port in proxy_pass, backend not listening yet (race on deploy), firewall blocking internal port, backend timing out
- [ ] 504 Gateway Timeout is a related but distinct symptom: upstream took too long, not that it failed outright
- [ ] Diagnostic order: is the backend process even running? Is it listening on the expected port? Does `curl localhost:<port>` from the VPS itself work? What does Nginx's error log say?

### A repeatable 502 diagnosis method

1. `sudo systemctl status <backend-service>` (or `docker ps` if containerized) - is it even running?
2. `curl http://127.0.0.1:3001/health` directly on the VPS - does the backend respond at all, bypassing Nginx?
3. `sudo tail -f /var/log/nginx/error.log` - look for `connect() failed` (wrong port/backend down) vs timeout messages.
4. Check the `proxy_pass` target port matches what the backend is actually listening on.
5. If this just happened after a deploy: did the new backend process finish starting before Nginx started routing to it (no readiness gate)?

### Model spoken answer

"A 502 means Nginx got the request fine but couldn't get a valid response from the backend it proxies to - usually because the backend process crashed, isn't listening on the port Nginx expects, or hasn't finished starting yet after a deploy. My first move is always to check if the backend process is actually running, then curl it directly on localhost to rule out Nginx entirely, then check Nginx's error log for the specific connect failure. A 504 is a related but different case - the backend is reachable but too slow to respond within the proxy timeout."

---

## Interview question bank (with answer targets)

1. **What is a reverse proxy, and why put one in front of your app?** -> single public entry point; handles TLS, routing, static assets, load balancing; hides internal topology.
2. **Explain the proxy_pass trailing slash behavior.** -> without trailing slash, the location prefix is preserved when forwarded; with it, the prefix is stripped.
3. **Why forward X-Forwarded-Proto and X-Real-IP to the backend?** -> backend needs to know the original scheme/client IP since Nginx terminates TLS and is the actual TCP peer.
4. **How does Let's Encrypt/Certbot work, and how often do you need to renew?** -> free automated CA; 90-day certs; Certbot sets up an automatic renewal job, renewing within ~30 days of expiry.
5. **What DNS record points a domain at a VPS's IP?** -> A record (AAAA for IPv6); CNAME for subdomain aliases.
6. **What does a 502 Bad Gateway actually mean, and how do you debug it?** -> Nginx couldn't get a valid response from upstream; check backend process status, port config, curl locally, check error logs.
7. **502 vs 504 - what's the difference?** -> no/invalid response from upstream vs upstream too slow (timeout).
8. **Why terminate TLS at Nginx instead of in the Node.js app?** -> centralizes certificate management, simplifies backend, lets multiple backend services share one public HTTPS endpoint.
9. **How would you serve a static SPA and proxy /api to a backend from the same Nginx config?** -> separate `location` blocks: `/` serving static files (or proxied to a Next.js server), `/api/` proxied with proxy_pass to the backend upstream.
10. **What's a basic VPS hardening checklist?** -> ufw default-deny with explicit allowed ports, SSH key auth (disable password auth), keep packages updated, monitor disk usage/logs, run services with auto-restart.

---

## Hands-on drills (do these)

- [ ] Write a full Nginx server block from scratch that redirects HTTP to HTTPS and proxies /api/ to a backend on port 3001, without looking at the example.
- [ ] Explain the trailing-slash proxy_pass behavior out loud with a concrete before/after URL example.
- [ ] Walk through the exact commands to get a Let's Encrypt certificate for a new domain on a fresh VPS.
- [ ] Describe, step by step, how you'd diagnose a 502 on a live site, without notes.
- [ ] Write a basic ufw firewall setup from memory.

---

## Senior red flags / green flags

### Green flags
- Knowing the proxy_pass trailing-slash behavior precisely, not vaguely.
- Explaining why forwarded headers matter, not just naming them.
- Having an actual diagnostic order for 502s instead of "I'd just restart it."
- Mentioning cert auto-renewal without being prompted (a lot of candidates only know how to get a cert once, not renew it).

### Red flags
- Not knowing what a reverse proxy is for beyond "it's for SSL."
- Confusing 502 and 504.
- No firewall/hardening awareness at all.
- Never having actually pointed a real domain at a real server (can't speak concretely about DNS propagation, TTL, or the registrar-to-DNS-provider relationship).

---

## Tie-backs to your experience

- Travel2Georgia is your headline story for this entire chapter: you personally "configured cloud infrastructure, Docker, Nginx, SSL, and domain management to deploy and maintain the application" for a full platform with a customer site, admin dashboard, and backend - be ready to walk through this end to end as a 90-second story (see chapter 05 for the drill).
- Freelance work generally lists "Docker, Nginx, SSL, VPS, and cloud services" as production infrastructure you designed and deployed - this is a genuinely uncommon, senior-level claim for someone whose primary identity is a mobile/frontend engineer, and interviewers will likely probe it - make sure you can go deep, not just name-drop.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can explain what a reverse proxy does and why it matters.
- [ ] I can write a correct Nginx config with HTTPS redirect and API proxying from memory.
- [ ] I know the proxy_pass trailing-slash behavior cold.
- [ ] I can explain Let's Encrypt/Certbot setup and renewal.
- [ ] I can explain DNS records needed to point a domain at a VPS.
- [ ] I have a repeatable method for diagnosing a 502.
- [ ] I can tell the Travel2Georgia deployment story fluently in under 2 minutes.
