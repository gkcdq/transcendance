include .env
export DOCKER_API_VERSION=1.44

all: bootstrap
	chmod +x backend/scripts/entrypoint.sh
	chmod +x backend/src/manage.py
	$(DOCKER_COMPOSE) up --build -d

bootstrap:
	mkdir -p frontend/vendor
	curl -L https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css \
	     -o frontend/vendor/bootstrap.min.css
	curl -L https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css.map \
	     -o frontend/vendor/bootstrap.min.css.map
	curl -L https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js \
	     -o frontend/vendor/bootstrap.bundle.min.js
	curl -L https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js.map \
	     -o frontend/vendor/bootstrap.bundle.min.js.map

stop:
	$(DOCKER_COMPOSE) stop

up:
	$(DOCKER_COMPOSE) up --detach

down:
	$(DOCKER_COMPOSE) down

clean:
	$(DOCKER_COMPOSE) down -v
	rm -rf backend/node_modules
	rm -rf backend/media
	rm -rf backend/staticfiles
	rm -rf frontend/vendor
	find backend/src -type d -name "__pycache__" -exec rm -rf {} +
	find backend/src -type d -name "*.pyc" -exec rm -rf {} +
	@echo "Nettoyage complet effectué."

logs:
	$(DOCKER_COMPOSE) logs -f

init-django:
	$(DOCKER_COMPOSE) run --rm backend django-admin startproject transcendence src

.PHONY: all stop up down clean logs init-django bootstrap
