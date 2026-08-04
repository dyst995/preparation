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

## Mastery checklist

- [ ] I can explain what a reverse proxy does and why it matters.
- [ ] I can write a correct Nginx config with HTTPS redirect and API proxying from memory.
- [ ] I know the proxy_pass trailing-slash behavior cold.
- [ ] I can explain Let's Encrypt/Certbot setup and renewal.
- [ ] I can explain DNS records needed to point a domain at a VPS.
- [ ] I have a repeatable method for diagnosing a 502.
- [ ] I can tell the Travel2Georgia deployment story fluently in under 2 minutes.
