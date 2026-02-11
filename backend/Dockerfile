FROM debian:bookworm
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY . .
RUN chmod +x scripts/setup.sh
EXPOSE 8000
CMD ["./scripts/setup.sh"]