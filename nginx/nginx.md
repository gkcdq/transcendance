# Nginx transcendence

## Role in the project

- Nginx is the **single public entry point** of the application.
- It listens on port **443 (HTTPS)** and acts as a reverse proxy.
- It receives every request from the browser and forwards it to the right internal service depending on the URL.
- No internal service (Django, Node.js, PostgreSQL, Redis) is directly exposed outside Docker. Only Nginx is.

```JS
Browser
   │  HTTPS / WSS
   ▼
Nginx :443 (mapped to host :8443)
   ├── /              → frontend static files  (HTML / JS / CSS)
   ├── /api/          → Django :8000           (REST API)
   ├── /admin/        → Django :8000           (admin portal)
   ├── /ws/           → Django Channels :8000  (WebSocket)
   ├── /media/        → shared volume          (uploaded avatars)
   ├── /static/       → static files           (Django static)
   └── /accounts/.../ → Node.js :3000          (OAuth 42 callback)
```

---

## SSL / TLS

Nginx handles HTTPS termination. The certificate is self-signed and generated at build time inside the Dockerfile using `openssl`.

- **Protocol**: TLSv1.2 and TLSv1.3 only (older versions disabled)
- **Certificate**: self-signed, valid 365 days, RSA 2048-bit
- **Key**: stored at `/etc/ssl/private/nginx.key`
- **Cert**: stored at `/etc/ssl/certs/ca-certificates.crt`

---

## Location blocks explained

### `/` — Frontend
```nginx
location / {
    root /var/www/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```
Serves the Vanilla JS SPA. `try_files` redirects all unknown paths to `index.html` so the frontend router handles them - this is required for SPAs.

---

### `/api/` and `/admin/` — Django REST API
```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
Forwards API requests to Django. The headers pass the real client IP and protocol to Django so it can build correct absolute URLs (e.g. for avatar URLs).

---

### `/ws/` — WebSocket (Django Channels)
```nginx
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```
WebSocket connections require HTTP/1.1 and the `Upgrade` + `Connection` headers to switch protocols. `proxy_read_timeout 86400` keeps the connection open for up to 24 hours without being dropped.

---

### `/accounts/fortytwo/login/callback/` — OAuth 42 callback
```nginx
location /accounts/fortytwo/login/callback/ {
    proxy_pass http://backend:3000;
}
```
When the 42 intranet redirects back after login, this route catches the callback and forwards it to the Node.js server on port 3000.

---

### `/media/` — Uploaded avatars
```nginx
location /media/ {
    alias /app/media/;
}
```
Serves user-uploaded avatar files from a shared Docker volume mounted at `/app/media/`. Django writes files there, Nginx reads and serves them directly without going through Django.

---

## Docker setup

### Dockerfile
```dockerfile
FROM debian:bookworm

RUN apt-get update && apt-get install -y nginx openssl \
    && rm -rf /var/lib/apt/lists/*

# Generate self-signed SSL certificate at build time
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -subj "/C=FR/ST=Paris/O=42/CN=tmilin.42.fr" \
    -keyout /etc/ssl/private/nginx.key \
    -out /etc/ssl/certs/nginx.crt

COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml (nginx service)
```yaml
nginx:
    build: ./nginx
    container_name: nginx
    ports:
      - "8443:443"
    volumes:
      - ./frontend:/var/www/html
      - ./backend/staticfiles:/var/www/static:ro
      - media_data:/app/media
    depends_on:
      - backend
```

The `media_data` volume is shared between the `backend` container (Django writes avatars) and the `nginx` container (Nginx serves them).

---

## Essential commands

### SSL certificate
```bash
# View full certificate details
docker exec -it nginx openssl x509 -in /etc/ssl/certs/nginx.crt -text -noout

# Get certificate fingerprint (MD5 + SHA1)
docker exec -it nginx openssl x509 -in /etc/ssl/certs/nginx.crt -noout -md5 -sha1 -fingerprint

# Check certificate expiry date
docker exec -it nginx openssl x509 -in /etc/ssl/certs/nginx.crt -noout -enddate

# Verify SSL handshake
openssl s_client -connect localhost:8443 -servername localhost
```

### Nginx process
```bash
# Enter the nginx container
docker compose exec nginx bash

# Test nginx config syntax
docker compose exec nginx nginx -t

# Reload nginx config without downtime
docker compose exec nginx nginx -s reload

# View nginx logs (access + errors)
docker compose logs nginx
docker compose logs nginx --follow

# View only error logs
docker compose exec nginx tail -f /var/log/nginx/error.log

# View only access logs
docker compose exec nginx tail -f /var/log/nginx/access.log
```

### Check ports and connectivity
```bash
# Verify nginx is listening on 8443
ss -tlnp | grep 8443

# Test HTTPS response (ignore self-signed cert warning)
curl -k https://localhost:8443/

# Test a specific API route
curl -k https://localhost:8443/api/users/leaderboard/

```

### Volume and file serving
```bash
# Check media files are accessible from nginx container
docker compose exec nginx ls /app/media/

# Check frontend files are mounted
docker compose exec nginx ls /var/www/html/
```

---

## How a request flows through Nginx

```
1. Browser sends:   GET https://localhost:8443/api/users/me/
2. Nginx receives:  matches location /api/
3. Nginx forwards:  http://backend:8000/api/users/me/
4. Django responds: { "username": "tmilin", ... }
5. Nginx returns:   JSON response to browser (over HTTPS)

1. Browser opens:   wss://localhost:8443/ws/game/
2. Nginx receives:  matches location /ws/
3. Nginx upgrades:  HTTP → WebSocket (Upgrade header)
4. Nginx tunnels:   persistent connection to Django Channels
5. Both sides:      can now send messages at any time
```