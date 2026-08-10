# BAD: copying everything first means ANY source file change invalidates — Introduction

> Source: `interview-prep/devops-cloud/01-docker.md`

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
