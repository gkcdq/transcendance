FROM debian:bookworm

RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# On crée un fichier index.html basique pour tester
RUN echo "<h1>Transcendence Frontend en attente...</h1>" > /var/www/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]