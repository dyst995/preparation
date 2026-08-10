# 03. SSL/TLS with Let's Encrypt/Certbot

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

### Topics to learn
- [ ] TLS termination at the reverse proxy vs at the app
- [ ] Certificate, private key, chain/fullchain files
- [ ] Let's Encrypt as a free, automated certificate authority
- [ ] Certbot's Nginx plugin (auto-edits Nginx config) vs webroot/manual mode
- [ ] Auto-renewal (certs are valid 90 days; renewal should be automated via cron/systemd timer)
- [ ] HTTP -> HTTPS redirect
- [ ] HSTS header awareness

### Setting up Certbot (typical VPS flow)

```bash
# Install certbot with the Nginx plugin
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain and auto-configure the certificate for your domain(s)
sudo certbot --nginx -d travel2georgia.ge -d www.travel2georgia.ge

# Certbot edits the Nginx config to add the ssl_certificate lines and
# sets up an HTTP -> HTTPS redirect automatically in most cases.

# Test the auto-renewal process without actually renewing
sudo certbot renew --dry-run
```

Certbot installs a systemd timer (or cron job, depending on the OS/install method) that runs `certbot renew` roughly twice a day, but only actually renews certificates within about 30 days of expiry - so most days it's a no-op. Since certs are valid for 90 days, this ensures they're renewed with plenty of margin without manual intervention.

### TLS termination point

Terminating TLS at Nginx (rather than at each app process) means:
- Only one place manages certificates.
- Backend services communicate over plain HTTP internally (fine, since it's within the same VPS/private network) which simplifies backend code (no cert handling in NestJS/Next.js).
- `X-Forwarded-Proto: https` tells the backend the original request was secure, even though the internal hop is HTTP.

### Model spoken answer

"I terminate TLS at Nginx using free Let's Encrypt certificates via Certbot's Nginx plugin, which edits the server block automatically and sets up the HTTP-to-HTTPS redirect. Certbot also installs an automatic renewal job, since Let's Encrypt certs are only valid for 90 days - I always verify that with `certbot renew --dry-run` right after setup so I'm not surprised by an expired cert three months later. Terminating at Nginx means the backend services can stay simple and just speak plain HTTP internally, while still knowing the original request was HTTPS via the X-Forwarded-Proto header."

---
