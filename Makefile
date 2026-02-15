include .env

export DOCKER_API_VERSION=1.44

all:
	chmod +x backend/scripts/entrypoint.sh
	chmod +x backend/src/manage.py
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


# --------------------------------- COMMANDE ---------------------------------
# docker compose up --build backend          // relance les containers backend
# docker compose up --build frontend         // relance les containers frontend
# docker compose up 					     // relance tous les containers
# docker compose down                        // arrete tous les containers

# ----------------------------------- LIEN -----------------------------------
# https://localhost:8443/admin/
# https://localhost:8443/api/users/me/