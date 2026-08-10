# 03. Multi-stage builds

> Source: `interview-prep/devops-cloud/01-docker.md`

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
