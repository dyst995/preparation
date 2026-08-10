# 06. Diagnosing a 502 Bad Gateway (the single most common real-world Nginx symptom)

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

### Topics to learn
- [ ] 502 means Nginx successfully received the request but got an invalid/no response from the upstream
- [ ] Common causes: backend process crashed/not running, wrong port in proxy_pass, backend not listening yet (race on deploy), firewall blocking internal port, backend timing out
- [ ] 504 Gateway Timeout is a related but distinct symptom: upstream took too long, not that it failed outright
- [ ] Diagnostic order: is the backend process even running? Is it listening on the expected port? Does `curl localhost:<port>` from the VPS itself work? What does Nginx's error log say?

### A repeatable 502 diagnosis method

1. `sudo systemctl status <backend-service>` (or `docker ps` if containerized) - is it even running?
2. `curl http://127.0.0.1:3001/health` directly on the VPS - does the backend respond at all, bypassing Nginx?
3. `sudo tail -f /var/log/nginx/error.log` - look for `connect() failed` (wrong port/backend down) vs timeout messages.
4. Check the `proxy_pass` target port matches what the backend is actually listening on.
5. If this just happened after a deploy: did the new backend process finish starting before Nginx started routing to it (no readiness gate)?

### Model spoken answer

"A 502 means Nginx got the request fine but couldn't get a valid response from the backend it proxies to - usually because the backend process crashed, isn't listening on the port Nginx expects, or hasn't finished starting yet after a deploy. My first move is always to check if the backend process is actually running, then curl it directly on localhost to rule out Nginx entirely, then check Nginx's error log for the specific connect failure. A 504 is a related but different case - the backend is reachable but too slow to respond within the proxy timeout."

---
