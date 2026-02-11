#!/bin/bash

# Attente de la DB
until pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER
do
  echo "En attente de PostgreSQL..."
  sleep 2
done

# On se déplace dans src (là où se trouve manage.py)
cd /app/src

# On applique les migrations
python3 manage.py migrate

# ON LANCE DAPHNE 
daphne -b 0.0.0.0 -p 8000 transcendance.asgi:application