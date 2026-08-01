# =============================================================================
#  LifeTrack deployment shortcuts. See DEPLOYMENT.md for the full guide.
# =============================================================================
SHELL := /bin/bash
COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help bootstrap env deploy deploy-pull build up down stop restart ps \
        logs logs-backend logs-ai logs-web logs-db health monitoring \
        db-shell backup restore seed prune config

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

bootstrap: ## One-time host setup (installs Docker; needs sudo)
	sudo bash deploy/scripts/bootstrap-vm.sh

env: ## Create .env from the template
	@test -f .env && echo ".env already exists, not overwriting" \
	  || (cp .env.example .env && chmod 600 .env && echo "created .env — now edit it")

deploy: ## Build, start and verify (role inferred from .env)
	bash deploy/scripts/deploy.sh

deploy-app: ## Split deployment: the app VM (nginx + Spring Boot + MySQL)
	bash deploy/scripts/deploy.sh --role app

deploy-ai: ## Split deployment: the AI VM (FastAPI + edge gate)
	bash deploy/scripts/deploy.sh --role ai

deploy-pull: ## Same as deploy, refreshing base images first
	bash deploy/scripts/deploy.sh --pull

monitoring: ## Start Prometheus + Grafana as well
	bash deploy/scripts/deploy.sh --monitoring

build: ## Build images without starting anything
	$(COMPOSE) build --pull

up: ## Start containers with existing images
	$(COMPOSE) up -d --remove-orphans

stop: ## Stop containers, keep them and the volumes
	$(COMPOSE) stop

down: ## Remove containers and the network (volumes are kept)
	$(COMPOSE) down --remove-orphans

restart: ## Restart every container
	$(COMPOSE) restart

ps: ## Container status
	$(COMPOSE) ps

config: ## Render the fully-resolved compose file
	$(COMPOSE) config

logs: ## Tail all logs
	$(COMPOSE) logs -f --tail=200

logs-backend: ## Tail the Spring Boot logs
	$(COMPOSE) logs -f --tail=200 backend

logs-ai: ## Tail the FastAPI logs
	$(COMPOSE) logs -f --tail=200 ai-service

logs-web: ## Tail the nginx logs
	$(COMPOSE) logs -f --tail=200 web

logs-db: ## Tail the MySQL logs
	$(COMPOSE) logs -f --tail=200 db

health: ## Probe the public endpoints
	@set -a; source .env; set +a; \
	base="http://127.0.0.1:$${HTTP_PORT:-80}"; \
	for p in /healthz / /api/health /ai/health /actuator/health; do \
	  printf '  %-22s %s\n' "$$p" "$$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $$base$$p)"; \
	done

db-shell: ## Open a MySQL shell as root
	@set -a; source .env; set +a; \
	$(COMPOSE) exec db mysql -uroot -p"$$MYSQL_ROOT_PASSWORD" "$${MYSQL_DATABASE:-lifestyle_ai}"

backup: ## Dump the database and the vector stores to ./backups
	bash deploy/scripts/backup-db.sh

restore: ## Restore a dump: make restore DUMP=backups/xxx.sql.gz
	@test -n "$(DUMP)" || (echo "usage: make restore DUMP=backups/xxx.sql.gz" && exit 1)
	bash deploy/scripts/restore-db.sh "$(DUMP)"

seed: ## Load the 7-day demo dataset (users 1 and 2 must exist)
	bash deploy/scripts/seed-demo.sh

prune: ## Reclaim disk from unused images (never touches volumes)
	docker image prune -af
	docker builder prune -f
