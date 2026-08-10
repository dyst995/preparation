# 02. Nginx config anatomy

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

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
