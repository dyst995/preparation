# 05. Docker, Nginx, SSL deployment (Travel2Georgia)

> Source: `interview-prep/nextjs/04-performance-deployment.md`

This is your standout section. Most Next.js candidates have only used Vercel and go blank on real infra questions - you actually did this.

### Topics to learn

- [ ] `next.config.js` -> `output: "standalone"` produces a minimal, self-contained server bundle (only the files actually needed at runtime) - dramatically smaller Docker images than copying the whole `node_modules`
- [ ] Multi-stage Docker build: one stage installs deps and builds, a final slim stage copies only the standalone output + static assets + public folder
- [ ] Running `node server.js` (the generated standalone server) inside the container, typically on an internal port (e.g. 3000)
- [ ] Nginx as a reverse proxy in front of the Node process: terminates SSL, handles gzip/br compression, sets caching headers for static assets, can serve `/_next/static/*` directly or proxy it, load-balances if multiple app instances run
- [ ] SSL via Let's Encrypt/Certbot (common self-hosted pattern) or a managed certificate, renewed automatically
- [ ] Domain/DNS pointing at the server, Nginx `server_name` and `server` blocks for the domain, HTTP -> HTTPS redirect
- [ ] Process management/restart policy (Docker restart policy, or a process manager) so the app comes back up after a crash or server reboot
- [ ] Why you'd choose this over Vercel: full control over infra, cost predictability at scale, ability to co-locate with other self-hosted services (DB, other backend), no vendor lock-in, and sometimes a project/client requirement to self-host

### Example: minimal Dockerfile shape for standalone output

```dockerfile
# deps stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runtime stage - only what's needed to run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Example: Nginx reverse proxy shape

```nginx
server {
    listen 80;
    server_name travel2georgia.example;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name travel2georgia.example;

    ssl_certificate     /etc/letsencrypt/live/travel2georgia.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/travel2georgia.example/privkey.pem;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Interview answer sketch (this is a genuinely strong story - use it)

> "On Travel2Georgia I owned the full deployment path, not just the app code. I used `output: 'standalone'` in `next.config.js` so the Docker image only contains the minimal server output instead of the entire `node_modules`, built it as a multi-stage Docker image to keep the final image small, and ran it behind Nginx as a reverse proxy. Nginx terminated SSL - certificates via Let's Encrypt - handled the HTTP-to-HTTPS redirect, served or cached the `/_next/static` assets aggressively since those are immutable, hashed filenames, and forwarded everything else to the Node process. I also handled domain/DNS setup and made sure the container had a restart policy so the app would recover automatically if it crashed or the host rebooted. It's a very different experience from clicking 'Deploy' on a managed platform, and it gave me a much better understanding of what those platforms are actually doing under the hood - which also makes me faster at debugging production issues on either kind of setup."

**Follow-up:** "Why self-host instead of Vercel for this project?"
> "It came down to control and cost predictability for a client project, and the fact that I was also running the backend services and could co-locate them efficiently on the same infrastructure rather than paying for and coordinating multiple managed platforms."

---
