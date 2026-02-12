FROM debian:bookworm

# Installation des dépendances
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    postgresql-client \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des packages Python
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copie du code source
COPY . .

# Configuration du script d'automatisation
# On le copie dans /usr/local/bin pour qu'il soit dans le PATH
COPY ./scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

# On garde UNIQUEMENT l'ENTRYPOINT
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]