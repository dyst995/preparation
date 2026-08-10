# 03. Part C - Live troubleshooting drills (say your method out loud, not just the answer)

> Source: `interview-prep/devops-cloud/05-interview-questions.md`

### Drill 1: "The production site is returning a 502. Walk me through what you'd do."

1. Check if the backend process/container is actually running (`systemctl status` / `docker ps`).
2. `curl` the backend directly on localhost, bypassing Nginx, to isolate whether it's an Nginx or backend issue.
3. Check Nginx's error log for the specific failure (`connect() failed` vs timeout).
4. Check whether this followed a recent deploy (readiness race, wrong port, bad config push).
5. Restart/roll back the specific failing piece once the cause is identified - not before.

### Drill 2: "Your SSL certificate expired unexpectedly. What happened and how do you prevent it next time?"

1. Check Certbot's renewal logs/timer status (`systemctl status certbot.timer`, `journalctl -u certbot`).
2. Common causes: the renewal cron/timer was disabled or failed silently, DNS changed and broke the HTTP validation challenge, or firewall/Nginx config changes blocked the validation path.
3. Manually renew (`certbot renew`) to restore service immediately.
4. Prevention: add uptime/certificate-expiry monitoring/alerting so a silent renewal failure surfaces before the cert actually expires, not after.

### Drill 3: "Disk is full on the VPS and the site is down. What do you check?"

1. `df -h` to confirm disk usage and which mount is full.
2. `du -sh /var/log/* /var/lib/docker/* | sort -rh` (or similar) to find what's consuming space - very often unrotated logs or old Docker images/layers.
3. Clear/rotate the offending logs (`docker system prune`, configure `logrotate`, or reduce log verbosity) to restore service.
4. Prevention: set up `logrotate` for app/Nginx logs, prune unused Docker images regularly, add a disk-usage alert threshold.

### Drill 4: "A mobile release build is failing in CI but works locally. What do you check?"

1. Compare environment: CI runner's Xcode/Android SDK/tooling versions vs local machine.
2. Check signing: does the CI runner have access to the same certificates/provisioning profiles via `match`, or is it a permissions/credentials issue specific to CI?
3. Check for hardcoded local paths/environment assumptions that don't hold on a clean CI runner.
4. Check CI job logs for the actual first failure, not just the final error - CI logs are often long and the root cause is earlier than the final reported failure.

---
