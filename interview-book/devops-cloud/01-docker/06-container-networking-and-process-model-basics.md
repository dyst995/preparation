# 06. Container networking and process model basics

> Source: `interview-prep/devops-cloud/01-docker.md`

### Topics to learn
- [ ] Default bridge network per compose project; containers on the same network can reach each other by name
- [ ] Port publishing (`-p host:container`) vs internal-only (`expose`)
- [ ] One main process per container is the convention (though not a hard technical rule)
- [ ] Container restarts: `restart: unless-stopped` / `always` policies
- [ ] Resource limits (`mem_limit`, `cpus`) awareness

### Model spoken answer

"By default, compose puts all services from one file on the same bridge network, and they can resolve each other by service name via Docker's built-in DNS. I only publish ports to the host that actually need to be reachable from outside - like Nginx on 80/443 - and keep the backend and database as `expose`-only or without any host port mapping at all, since Nginx is the only thing that should be able to reach them directly."

---
