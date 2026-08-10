# 01. Images vs containers vs registries

> Source: `interview-prep/devops-cloud/01-docker.md`

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
