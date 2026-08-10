# 09. Senior red flags / green flags

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

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
