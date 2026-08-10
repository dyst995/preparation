# 05. VPS basics: systemd, firewall, logs

> Source: `interview-prep/devops-cloud/02-nginx-ssl-vps.md`

### Topics to learn
- [ ] Running app processes as systemd services (auto-restart, boot-start, log integration via journalctl)
- [ ] Firewall basics (`ufw`): default deny, explicitly allow 22/80/443
- [ ] SSH key-based auth over password auth
- [ ] Common log locations: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`, `journalctl -u <service>`
- [ ] Disk space monitoring (logs filling up disk is a very real, very common production incident)

### Example systemd service (if not using Docker/compose for a process)

```ini
# /etc/systemd/system/travel2georgia-api.service
[Unit]
Description=Travel2Georgia backend API
After=network.target

[Service]
ExecStart=/usr/bin/node /var/www/travel2georgia/backend/dist/main.js
Restart=always
User=deploy
Environment=NODE_ENV=production
WorkingDirectory=/var/www/travel2georgia/backend

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable travel2georgia-api
sudo systemctl start travel2georgia-api
sudo journalctl -u travel2georgia-api -f   # tail logs live
```

### Basic firewall setup

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH   # or `ufw allow 22`
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Model spoken answer

"On a VPS I run application processes either via Docker Compose with restart policies, or as systemd services with Restart=always so they come back up automatically after a crash or reboot. I lock down the firewall with ufw to a default-deny stance, only opening SSH, 80, and 443. For diagnosing issues I check Nginx's access and error logs and journalctl for the app service, and I keep an eye on disk usage since unrotated logs filling the disk is a surprisingly common way to take a whole VPS down."

---
