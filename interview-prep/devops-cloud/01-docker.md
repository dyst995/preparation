01 - Docker

Goal: Explain images vs containers precisely, write a production-quality Dockerfile with multi-stage builds, and reason about docker-compose and container networking/volumes at a depth that matches someone who has actually deployed a production platform (Travel2Georgia) with Docker.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain the difference between an image and a container precisely (not "a container is a running image" as a hand-wave, but why).
2. Explain image layers and caching, and how that impacts Dockerfile instruction ordering.
3. Write a multi-stage Dockerfile for a Node.js/NestJS or Next.js app, and explain why it's smaller and safer than a single-stage build.
4. List concrete Dockerfile best practices and justify each one.
5. Write a docker-compose file wiring together an app, a database, and Nginx.
6. Explain container networking basics (bridge networks, service discovery by name) and volumes vs bind mounts.
7. Explain how you'd pass secrets/environment variables safely.

---

## 1. Images vs containers vs registries

### Topics to learn
- [ ] Image = a read-only, layered template (a "class")
- [ ] Container = a running (or stopped) instance of an image, with its own writable layer (an "object"/instance)
- [ ] Registry = where images are stored/distributed (Docker Hub, GitHub Container Registry, AWS ECR, GitLab Container Registry)
- [ ] Image layers are built from each Dockerfile instruction and are cached/shared
- [ ] A container's writable layer is ephemeral by default - deleted when the container is removed, unless you use volumes

### The precise mental model

An **image** is a stack of read-only filesystem layers plus metadata (entrypoint, exposed ports, env defaults). Building an image with `docker build` executes each Dockerfile instruction and (usually) creates a new layer.

A **container** is created from an image by adding one thin writable layer on top, then running a process (the image's `CMD`/`ENTRYPOINT`) inside an isolated set of Linux namespaces (process, network, mount, etc.) and cgroups (resource limits). Multiple containers can be started from the same image; each gets its own independent writable layer and process, but they all share the same underlying read-only image layers on disk (saving space).

### Model spoken answer

"An image is an immutable, layered filesystem template plus metadata like the entrypoint and exposed ports - think of it like a class. A container is a running instance of that image: Docker adds a thin writable layer on top and starts a process inside isolated namespaces and cgroups - think of it like an object. Multiple containers from the same image share the same underlying read-only layers on disk, which is why spinning up many containers from one image is cheap in terms of storage."

---

## 2. Image layers and build caching

### Topics to learn
- [ ] Each Dockerfile instruction (mostly) creates a new layer
- [ ] Docker caches layers and reuses them if the instruction and its inputs haven't changed
- [ ] Cache invalidation cascades - once one layer changes, every layer after it rebuilds
- [ ] Instruction ORDER matters: put rarely-changing steps first, frequently-changing steps (like copying source code) last
- [ ] `.dockerignore` to avoid invalidating cache (and bloating build context) with irrelevant files

### The classic ordering mistake vs the fix

```dockerfile
# BAD: copying everything first means ANY source file change invalidates
# the npm install cache, forcing a full reinstall on every build.
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "dist/main.js"]
```

```dockerfile
# GOOD: copy only dependency manifests first, install, THEN copy source.
# Changing application code no longer invalidates the npm install layer.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["node", "dist/main.js"]
```

### Model spoken answer

"Docker builds an image layer by layer and caches each layer, keyed roughly by the instruction and its inputs. If I copy the whole source tree before installing dependencies, any code change invalidates the cache from that point forward, including the expensive dependency install. So I always copy just `package.json`/lockfiles first, run the install, and copy the rest of the source afterward - that way editing application code doesn't force a full dependency reinstall on every build."

---

## 3. Multi-stage builds

### Topics to learn
- [ ] Why ship build tools (TypeScript compiler, dev dependencies) in the final image is wasteful and a security risk
- [ ] `FROM ... AS builder` naming a stage
- [ ] `COPY --from=builder ...` pulling only the built artifact into a slim final stage
- [ ] Smaller final image = faster deploys, smaller attack surface, less to patch

### Full example: multi-stage Dockerfile for a NestJS backend

```dockerfile
# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build          # compiles TypeScript to dist/
RUN npm prune --production # drop devDependencies from node_modules

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Run as a non-root user for security (see best practices below)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

The `builder` stage has the TypeScript compiler, dev dependencies, and full source tree - all of that is thrown away. The final `runner` stage only contains production `node_modules`, the compiled `dist/` output, and `package.json` - nothing else. This can easily cut an image from 900MB+ down to under 150MB, and removes build tooling that would otherwise sit in your production image as unnecessary attack surface.

### Similar pattern for a Next.js frontend (Travel2Georgia-style)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

(Using Next.js's `output: 'standalone'` build mode keeps the runtime image lean by tracing only the files actually needed at runtime.)

### Model spoken answer

"I use multi-stage builds so the final image doesn't carry build-only tooling. A builder stage installs everything, compiles TypeScript or runs the Next.js build, and then the final stage copies over only the compiled output and production dependencies, running as a non-root user. On Travel2Georgia this kept both the customer-facing site and the backend images small and fast to deploy, and reduced what was actually exposed at runtime."

---

## 4. Dockerfile best practices (checklist you should be able to recite)

### Topics to learn
- [ ] Pin base image versions (`node:20-alpine`, not `node:latest`)
- [ ] Use slim/alpine base images where compatible
- [ ] Multi-stage builds to separate build-time from run-time
- [ ] Order instructions from least-to-most frequently changing
- [ ] Use `.dockerignore` (node_modules, .git, .env, dist, etc.)
- [ ] Run as a non-root user
- [ ] Use `COPY` over `ADD` unless you specifically need `ADD`'s tar-extraction/URL behavior
- [ ] One process per container (don't run a whole init system unless you need to)
- [ ] Use `EXPOSE` for documentation (it does not actually publish the port - `-p`/`ports:` does that)
- [ ] Set `NODE_ENV=production` (or equivalent) explicitly
- [ ] Add a `HEALTHCHECK` for orchestration/compose visibility
- [ ] Never bake secrets into image layers (they persist in image history even if a later layer "deletes" them)

### Example `.dockerignore`

```
node_modules
npm-debug.log
dist
.git
.env
.env.*
*.md
.vscode
```

### HEALTHCHECK example

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

### Why never bake secrets into an image

```dockerfile
# WRONG: even if you delete the .env file in a later layer,
# it still exists in the image's layer history and can be extracted.
COPY .env .env
RUN rm .env
```

Docker images are a stack of layers; removing a file in a later layer just hides it in the final filesystem view - the file's bytes remain retrievable from the earlier layer by anyone who can pull the image or inspect its history. Secrets belong in environment variables injected at container runtime (`docker run -e`, `docker-compose` env files not committed to git, or a secrets manager), never baked into the image itself.

### Model spoken answer

"My Dockerfile checklist: pin the base image version, use alpine where compatible, multi-stage build to strip dev tooling, order instructions so dependency installs cache well, use a .dockerignore so I'm not copying node_modules or .env into the build context, run as a non-root user, and never bake secrets into the image - because even 'deleting' a file in a later layer doesn't remove it from the image's history. Secrets get injected at runtime as environment variables instead."

---

## 5. docker-compose

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

## 6. Container networking and process model basics

### Topics to learn
- [ ] Default bridge network per compose project; containers on the same network can reach each other by name
- [ ] Port publishing (`-p host:container`) vs internal-only (`expose`)
- [ ] One main process per container is the convention (though not a hard technical rule)
- [ ] Container restarts: `restart: unless-stopped` / `always` policies
- [ ] Resource limits (`mem_limit`, `cpus`) awareness

### Model spoken answer

"By default, compose puts all services from one file on the same bridge network, and they can resolve each other by service name via Docker's built-in DNS. I only publish ports to the host that actually need to be reachable from outside - like Nginx on 80/443 - and keep the backend and database as `expose`-only or without any host port mapping at all, since Nginx is the only thing that should be able to reach them directly."

---

## Interview question bank (with answer targets)

1. **What's the difference between an image and a container?** -> immutable layered template vs a running instance with its own writable layer and process.
2. **Why does Dockerfile instruction order matter?** -> layer caching; put rarely-changing steps (dependency install) before frequently-changing ones (source copy).
3. **What is a multi-stage build and why use one?** -> separate build tooling from runtime; smaller, more secure final image.
4. **Why shouldn't you bake secrets into a Docker image, even if you delete them in a later layer?** -> layers are immutable and stacked; earlier layer contents remain extractable from the image.
5. **What does EXPOSE actually do?** -> documentation only; doesn't publish the port. `-p`/`ports:` actually maps host to container port.
6. **How do containers on the same docker-compose network talk to each other?** -> by service name, resolved via Docker's internal DNS on the shared bridge network.
7. **depends_on vs healthcheck - what's the gap?** -> depends_on only waits for the container process to start, not for the app to be ready to serve traffic; use a healthcheck + `condition: service_healthy` to actually wait for readiness.
8. **Named volume vs bind mount?** -> Docker-managed persistent storage vs mounting a specific host path (common for local dev live-reload).
9. **Why run as a non-root user inside the container?** -> limits blast radius if the container is compromised; many container escape/privilege escalation techniques rely on root inside the container.
10. **How would you shrink a 1GB Node.js image?** -> alpine base, multi-stage build dropping devDependencies and build tools, `.dockerignore`, prune unused files.

---

## Hands-on drills (do these)

- [ ] Write a multi-stage Dockerfile from scratch for a small Node.js app without looking at the example above, then compare.
- [ ] Write a `.dockerignore` file from memory.
- [ ] Write a docker-compose.yml with an app service and a Postgres service, including a healthcheck.
- [ ] Explain out loud why `COPY package.json` then `RUN npm ci` then `COPY . .` is the right order, and what breaks if you reverse it.
- [ ] Explain the "secrets in image layers" trap without notes.

---

## Senior red flags / green flags

### Green flags
- Explaining the image/container distinction precisely (layers + writable layer + namespaces/cgroups), not just "container is a lightweight VM."
- Knowing layer caching well enough to order a Dockerfile correctly without trial and error.
- Bringing up multi-stage builds unprompted when asked about image size.
- Knowing depends_on's limitation and reaching for healthchecks.
- Mentioning non-root users and the secrets-in-layers trap unprompted.

### Red flags
- "A container is basically a lightweight VM" with no further nuance.
- Not knowing what a multi-stage build is.
- Believing `RUN rm secrets.txt` in a later layer actually removes it from the image.
- Copying the entire project directory before installing dependencies without recognizing the caching cost.

---

## Tie-backs to your experience

- Travel2Georgia: you explicitly configured Docker as part of production infrastructure for a multi-part platform (customer site, admin dashboard, backend) - you can describe your actual container layout (likely one container per service, Nginx in front) as a real example, not a hypothetical.
- Freelance work lists Docker, Nginx, SSL, VPS explicitly as production infrastructure you designed and deployed yourself, end to end - a genuinely rare, senior-sounding claim for candidates who have only ever deployed to a PaaS.

---

## Senior-Level Best Practices

### Rapid-fire scenario responses (say these in one breath)
- "A `.env` file was accidentally committed and later removed in a follow-up commit." -> Rotate the secret immediately; git history still contains it regardless of the follow-up commit.
- "The image works locally but fails in CI with a different dependency version." -> Missing or unpinned base image tag / lockfile mismatch; pin versions and commit lockfiles.
- "Container keeps restarting in a crash loop." -> Check `docker logs`/exit code first; `restart: always` will keep it "up" in name only if you don't investigate.
- "Final image is 1.2GB for a small Node API." -> Missing multi-stage build; devDependencies and build tools are likely still present in the runtime layer.
- "Someone wants to run the container as root 'just for this one debug session.'" -> Fine temporarily for local debugging only; never as a standing production configuration.

### Decision framework: what goes in the image vs what gets injected at runtime
- Build-time, baked into the image: application code, compiled artifacts, fixed dependencies, a pinned base image version - anything that should be identical across every environment.
- Runtime, injected via environment variables/secrets manager: database URLs, API keys, feature flags, anything that differs between staging and production or that is sensitive.
- Rule of thumb: if changing it should require a new deploy, bake it in; if changing it should NOT require a rebuild, inject it at runtime. Never solve "config differs per environment" by baking multiple config files into one image and picking one with an entrypoint script unless you have a very specific reason - it defeats the "build once, promote everywhere" guarantee.

### Immutable artifact checklist (build once, deploy everywhere)
- [ ] The image built for staging is the exact same image (same digest/tag, not rebuilt) promoted to production - never rebuild per environment.
- [ ] Images are tagged with something traceable (commit SHA), not just `latest`, so you can always answer "what code is actually running in production right now."
- [ ] The Dockerfile pins the base image by a specific tag (and ideally digest for maximum reproducibility), so a `docker build` next month doesn't silently pull a different base image.
- [ ] CI produces the image; nothing is ever manually `docker build`'d and pushed from a developer's laptop into production.
- [ ] A rollback is "redeploy the previous image tag," not "rebuild from an older commit" - rebuilding can produce a subtly different artifact if a base image or dependency moved underneath you.

### Least privilege and secret hygiene checklist
- [ ] Containers run as a non-root user (covered in the base chapter) - and additionally, drop unnecessary Linux capabilities (`--cap-drop=ALL` plus only what's needed) for anything internet-facing.
- [ ] Secrets are never in the Dockerfile, never in `docker-compose.yml` committed to git, never in a baked-in `.env` file - only injected via runtime environment variables, a secrets manager, or orchestrator-native secrets (Docker Swarm secrets, Kubernetes Secrets, or your CI/CD platform's protected variables).
- [ ] Registry credentials and any deploy-target SSH keys are scoped as narrowly as possible - a CI pipeline pushing to one registry doesn't need account-wide registry admin rights.
- [ ] Base images are scanned for known CVEs (`docker scout`, `trivy`, or your registry's built-in scanning) as a CI gate, not an occasional manual check.
- [ ] Multi-architecture builds (`buildx`) are considered explicitly if the team's dev machines (e.g. Apple Silicon) differ from production's target architecture, avoiding a class of "works on my machine, fails in prod" bugs specific to containers.
- [ ] `.dockerignore` explicitly excludes `.env`, `.git`, and any credentials directory - verified, not assumed.
- [ ] Multi-stage builds are used consistently across services, not just the one service someone happened to optimize once.
- [ ] Health checks are wired into the orchestrator (compose/Swarm/Kubernetes readiness probes), not just present in the Dockerfile as documentation.

### Worked scenario: shrinking and hardening a bloated production image
1. **Measure first** - `docker history` and `docker image inspect` to see which layers are actually large before guessing.
2. **Check the base image** - is it `node:20` (full Debian-based) when `node:20-alpine` would work? That alone often cuts hundreds of MB.
3. **Check for a missing multi-stage split** - if devDependencies, TypeScript source, and build tools are all present in the final image, that's the single biggest win available.
4. **Check `.dockerignore`** - is `node_modules`, `.git`, or test fixtures accidentally bloating the build context and getting copied in?
5. **Add the non-root user and HEALTHCHECK** if missing, since a hardening pass is a natural time to close both gaps at once.
6. **Re-measure and record the before/after size** - this is exactly the kind of concrete, numeric result ("900MB to 140MB") that's worth remembering for an interview story.

### Anti-patterns and failure modes
| Anti-pattern | Failure mode | Fix |
|---|---|---|
| `docker build` run separately per environment with different Dockerfiles | "It worked in staging" mismatches, drift between what was tested and what's live | One image, environment differences via runtime config only |
| Using `latest` tag in production | Can't reliably answer what's actually deployed; accidental unintended upgrades | Immutable, traceable tags (commit SHA) |
| Running containers as root because "it's easier" | Container compromise has full root-equivalent access inside the container, larger blast radius | Non-root user, dropped capabilities |
| Committing a `.env` file "temporarily" for convenience | It's now in git history forever, even after deletion | `.env.example` with placeholder values only, real secrets injected at runtime/CI |
| No image vulnerability scanning | Known CVEs in a base image ship to production undetected | Automated scanning as a CI gate with a fail threshold |

### Common production incidents mapped to root cause
| Symptom | Likely root cause | First check |
|---|---|---|
| Container keeps restarting | App crash on startup, missing env var, or OOM kill | `docker logs`, `docker inspect` for exit code/OOM flag |
| Deploy "worked" but old code is still running | Image tagged `latest` and cached, not actually rebuilt/pulled | Confirm the exact digest running vs the one just pushed |
| Secret exposed in a security scan | Secret baked into an image layer, even after later deletion | Rotate immediately, rebuild without ever writing it to a layer |
| Image build suddenly breaks after months of stability | Unpinned base image tag pulled a new, incompatible version | Pin base image to a specific tag/digest |
| Slow deploys under load | Large image size, no multi-stage build | Audit layers with `docker history`, add multi-stage build |

### Observability for containerized services
- Ship container stdout/stderr to a centralized log aggregator - `docker logs` on a single host doesn't scale past one box and disappears when the container is removed.
- Track image size and build time trends in CI - a slowly growing image size over months is a real signal of dependency bloat worth periodically auditing.
- Monitor container restart counts - a container stuck in a crash-restart loop is a very different problem from a healthy long-running one, and `restart: always` can mask the former by making it look "up" in a shallow health check.
- Alert on container OOM kills specifically (distinct from generic crashes) - they usually mean a memory limit is too tight or there's a real leak, and the fix is different in each case.

### Scalability and team practices
- Standardize on one base image family (e.g. always `node:20-alpine` across services) so security patches and known quirks are shared team knowledge, not rediscovered per service.
- Keep a short, written runbook for "roll back a bad deploy" that's just "redeploy the previous tag" - practiced and boring beats clever and undocumented.
- Review Dockerfiles in PRs with the same checklist every time (non-root, pinned base, multi-stage, no secrets) so the checklist becomes muscle memory across the team, not one person's personal habit.
- When a team grows past a couple of services, invest in a shared base Dockerfile/template rather than letting each service reinvent Dockerfile best practices independently.

### Senior follow-up Q&A
1. **Why is "build once, deploy everywhere" a bigger deal than it sounds?** -> Without it, staging and production can run artifacts built from technically the same source but at different times, potentially pulling different transitive dependency versions or a moved base image tag - so a bug that "only happens in production" might just be a different actual binary than what you tested, not a real environment-specific bug. Promoting one immutable, digest-pinned artifact removes that entire class of confusion.
2. **A container was compromised. What does running as non-root with dropped capabilities actually buy you in that scenario?** -> It limits what the attacker can do even after gaining code execution inside the container - no ability to bind privileged ports, install system packages, modify most of the filesystem, or (critically) more easily break out to the host via kernel/capability-dependent escape techniques that assume root. It's defense in depth, not a guarantee, but it meaningfully shrinks the blast radius.
3. **How do you rotate a leaked secret that was briefly committed to a Dockerfile or compose file?** -> Rotate the actual credential at the source immediately (the leak matters regardless of git history), then remove it from the current files, and treat the git history as compromised - either purge it with a history rewrite (`git filter-repo`) if the repo is small/early enough to coordinate, or accept the history exists and rely entirely on the rotation, since a determined party can always find it in old commits/forks either way.
4. **What's your rollback plan if a new image deploy is broken in production and you need to recover in under 2 minutes?** -> Because artifacts are immutable and tagged by commit SHA, rollback is redeploying the last known-good tag - no rebuild, no "let's try reverting the commit and building again under pressure." This is exactly why the tagging/promotion discipline matters before the incident, not during it.
5. **How would you justify the cost of adding CVE scanning to a CI pipeline to a team that just wants to ship fast?** -> Frame it as a fast, automated gate that runs in parallel with other CI stages (not a slow manual step blocking velocity), catching known, exploitable vulnerabilities before they reach production rather than after a security report or incident forces an emergency patch - the cost is a few seconds of CI time; the alternative cost is an incident response.
6. **How do you decide when a project has outgrown Docker Compose on a single VPS?** -> Watch for concrete signals rather than a gut feeling: needing more app instances than one box can comfortably run, needing zero-downtime deploys more reliably than manual blue-green allows, needing to scale services independently (the API needs 5x the frontend), or needing self-healing across multiple hosts. Any one of these is a legitimate trigger; "it feels more professional" is not.

---

## Mastery checklist

- [ ] I can precisely explain image vs container, including layers, the writable layer, and namespaces/cgroups.
- [ ] I can write a correct multi-stage Dockerfile for a Node.js app from memory.
- [ ] I can explain and demonstrate proper Dockerfile layer-caching order.
- [ ] I can write a docker-compose file with a healthcheck and explain depends_on's limitation.
- [ ] I can explain why secrets should never be baked into an image.
- [ ] I can tell the Travel2Georgia Docker deployment story fluently.
