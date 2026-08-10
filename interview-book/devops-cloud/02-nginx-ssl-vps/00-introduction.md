# /etc/nginx/conf.d/travel2georgia.conf — Introduction

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

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
