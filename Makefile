include .env

export DOCKER_API_VERSION=1.44

all:
	chmod +x backend/scripts/setup.sh
	$(DOCKER_COMPOSE) up --build

# arreter les containers sans supprimer les données
stop:
	$(DOCKER_COMPOSE) stop

# tout arreter et supprimer les containers
down:
	$(DOCKER_COMPOSE) down

# supprime images containers volumes
# reinitialise la base de donne
clean:
	$(DOCKER_COMPOSE) down -v
	@echo "Nettoyage complet effectué."

# voir les logs en temps reel
logs:
	$(DOCKER_COMPOSE) logs -f

# --- Commandes spécifiques à ton étape actuelle ---

# Pour initialiser le projet Django si ce n'est pas encore fait
init-django:
	$(DOCKER_COMPOSE) run --rm backend django-admin startproject transcendence src

.PHONY: all stop down clean logs init-django