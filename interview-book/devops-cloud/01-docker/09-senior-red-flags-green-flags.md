# 09. Senior red flags / green flags

> Source: `interview-prep/devops-cloud/01-docker.md`

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
