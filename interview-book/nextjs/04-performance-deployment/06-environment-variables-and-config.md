# 06. Environment variables and config

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Topics to learn

- [ ] `NEXT_PUBLIC_` prefix = inlined into the client bundle at build time, visible to anyone - never put secrets behind this prefix
- [ ] Non-prefixed env vars are only available server-side (Server Components, Route Handlers, Server Actions, `next.config.js`)
- [ ] Build-time vs runtime env vars: in a standard Next.js build, `NEXT_PUBLIC_*` values get baked in at build time - if you need truly runtime-configurable public values (e.g. same Docker image promoted through dev/staging/prod without rebuilding), you need a pattern for that (e.g. reading config at request time from a non-`NEXT_PUBLIC_` var and exposing via an API route, or entrypoint scripts that substitute values before `node server.js` starts)
- [ ] `.env.local`, `.env.production`, `.env.development` precedence and gitignore hygiene - never commit real secrets
- [ ] In Docker deployments, secrets are typically passed as container environment variables at runtime, not baked into the image

### Interview question

**Q: What happens if you accidentally use `NEXT_PUBLIC_` on an API secret?**

> "It gets inlined directly into the client-side JavaScript bundle at build time, meaning literally anyone can open dev tools and read it. It's not a runtime leak you can patch - you'd have to rotate the secret and rebuild without the prefix. That's why I'm strict about only using `NEXT_PUBLIC_` for values that are genuinely safe to expose, like a public API base URL or a public analytics key, and keeping everything else - DB credentials, private API keys, JWT signing secrets - unprefixed and server-only."

**Q: You have one Docker image you want to promote from staging to production without rebuilding - what's the env var gotcha?**

> "If any config differs between environments and is read via `NEXT_PUBLIC_*`, it's already baked into that build's JS bundle and can't change at runtime without rebuilding. For a build-once-deploy-many workflow, public runtime config needs a different pattern - fetching config from an endpoint at runtime, or using a startup script that injects values into a runtime-read file/window global before the app serves traffic - rather than relying on build-time env inlining."

---
