# 02. Image layers and build caching

> Source: `interview-prep/devops-cloud/01-docker.md`

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
