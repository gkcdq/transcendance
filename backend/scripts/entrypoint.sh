#!/bin/bash

set -e

echo "start script were is in entrypoint.sh"

echo "ETAPE 1: Attente de PostgreSQL..."
until c_out=$(python3 -c "import psycopg2; psycopg2.connect(dbname='$POSTGRES_DB', user='$POSTGRES_USER', password='$POSTGRES_PASSWORD', host='db')" 2>/dev/null); do
  sleep 1
done
echo "ETAPE 2: PostgreSQL est pret les gars"
cd src
echo "ETAPE 3 & 4: Migrations"
python3 manage.py makemigrations --noinput
python3 manage.py migrate --noinput
echo "ETAPE 4: Application des migrations..."
python3 manage.py migrate --noinput
echo "EATEPE 5: Verification du Superuser..."
python3 manage.py createsuperuser --noinput || echo "Superuser deja la."
echo "ETAPE 6: Collecte des fichiers statiques"
python3 manage.py collectstatic --noinput --clear
# Ajoute cette ligne pour donner les droits de lecture à Nginx
chmod -R 755 /app/staticfiles
echo " entrypoint.sh done / Lancement de Daphne"
exec daphne -b 0.0.0.0 -p 8000 transcendance.asgi:application