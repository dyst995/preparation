# 01. What a reverse proxy is, and why

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

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
