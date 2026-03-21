include .env

export DOCKER_API_VERSION=1.44

all:
	chmod +x backend/scripts/entrypoint.sh
	chmod +x backend/src/manage.py
	$(DOCKER_COMPOSE) up --build

# arreter les containers sans supprimer les données
stop:
	$(DOCKER_COMPOSE) stop

up:
	$(DOCKER_COMPOSE) up --detach

# tout arreter et supprimer les containers
down:
	$(DOCKER_COMPOSE) down

# supprime images containers volumes
# reinitialise la base de donne
clean:
	$(DOCKER_COMPOSE) down -v
	rm -rf backend/node_modules
	rm -rf backend/media
	find backend/src -type d -name "__pycache__" -exec rm -rf {} +
	find backend/src -type d -name "*.pyc" -exec rm -rf {} +
	@echo "Nettoyage complet effectué." 

logs:
	$(DOCKER_COMPOSE) logs -f

# Pour initialiser le projet Django si ce n'est pas encore fait
init-django:
	$(DOCKER_COMPOSE) run --rm backend django-admin startproject transcendence src

.PHONY: all stop up down clean logs init-django
