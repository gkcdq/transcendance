FROM debian:bookworm

RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Supprime la config par défaut et le fichier d'attente
RUN rm /var/www/html/index.nginx-debian.html

# COPIE les fichiers vers le container
COPY ./index.html /var/www/html/
COPY ./style.css /var/www/html/
COPY ./src /var/www/html/src

# Lance Nginx
CMD ["nginx", "-g", "daemon off;"]