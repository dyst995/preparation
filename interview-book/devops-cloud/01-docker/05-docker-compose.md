# 05. docker-compose

> Source: `interview-prep/devops-cloud/01-docker.md`

### Topics to learn
- [ ] `services`, `networks`, `volumes` top-level keys
- [ ] Each service gets its own container(s) plus DNS-based service discovery by service name
- [ ] `depends_on` (and its limitation: it waits for container start, not "app ready" - need healthchecks for that)
- [ ] `environment` / `env_file`
- [ ] `ports` (host:container mapping) vs `expose` (internal only)
- [ ] Named volumes for persistent data (e.g. database files) vs bind mounts for local dev

### Example: app + database + Nginx (Travel2Georgia-style stack)

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://app:app@db:5432/travel2georgia
    depends_on:
      db:
        condition: service_healthy
    expose:
      - "3000" # internal only; Nginx proxies to this, not exposed to the host directly

  frontend:
    build: ./frontend
    expose:
      - "3001"

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=app
      - POSTGRES_DB=travel2georgia
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend

volumes:
  db_data:
```

Note: inside the Docker network, services reach each other by service name as a hostname (`db`, `backend`, `frontend`) - Docker's embedded DNS resolves these automatically on the default bridge network compose creates. That's why `DATABASE_URL` uses `db` as the host, not `localhost` or an IP.

### Volumes vs bind mounts

| | Named volume | Bind mount |
|---|---|---|
| Managed by | Docker | You (a host path) |
| Typical use | Production persistent data (databases) | Local dev (mount source code for live-reload) |
| Portability | Portable across hosts via Docker | Tied to a specific host path |

### Model spoken answer

"docker-compose lets me define the whole stack - app, database, reverse proxy - as one file, with services able to reach each other by service name over Docker's internal network DNS, which is why my backend's DATABASE_URL points at 'db' instead of localhost. I use named volumes for anything that needs to persist, like Postgres data, so it survives container recreation, and I use depends_on together with healthchecks - not just depends_on alone - since depends_on only waits for the container to start, not for the app inside it to actually be ready."

---
