# 07. Interview question bank (with answer targets)

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

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
