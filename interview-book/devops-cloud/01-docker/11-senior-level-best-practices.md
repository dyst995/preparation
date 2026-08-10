# 11. Senior-Level Best Practices

> Source: `interview-prep/devops-cloud/01-docker.md`

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
