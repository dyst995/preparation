# 04. Dockerfile best practices (checklist you should be able to recite)

> Source: `interview-prep/devops-cloud/01-docker.md`

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
