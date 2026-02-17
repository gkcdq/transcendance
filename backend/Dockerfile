FROM debian:bookworm

# Installation des dépendances + Node.js
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    postgresql-client \
    libpq-dev gcc \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation Python
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Installation des dépendances Node.js (essentiel si tu as un package.json)
COPY package*.json ./ 
RUN npm install

# Copie du reste du code
COPY . .

COPY ./scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]