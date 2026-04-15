FROM node:20-alpine AS builder

WORKDIR /app
RUN npm init -y && npm install bootstrap@5.3.3
COPY . .
RUN mkdir -p /app/vendor && \
    cp node_modules/bootstrap/dist/css/bootstrap.min.css /app/vendor/ && \
    cp node_modules/bootstrap/dist/js/bootstrap.bundle.min.js /app/vendor/

# Stage final
FROM debian:bookworm
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

RUN rm /var/www/html/index.nginx-debian.html

# Copie depuis le builder
COPY --from=builder /app/index.html /var/www/html/
COPY --from=builder /app/style.css /var/www/html/
COPY --from=builder /app/src /var/www/html/src
COPY --from=builder /app/vendor /var/www/html/vendor
COPY --from=builder /app/Mokoko.webp /var/www/html/

CMD ["nginx", "-g", "daemon off;"]