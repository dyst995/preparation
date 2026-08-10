# 04. Domains and DNS basics

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

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
