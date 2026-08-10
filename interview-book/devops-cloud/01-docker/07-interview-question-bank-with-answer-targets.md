# 07. Interview question bank (with answer targets)

> Source: `interview-prep/devops-cloud/01-docker.md`

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
