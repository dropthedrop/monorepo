# Minimal make targets for local dev

.PHONY: up reset test e2e load

up:
	@echo "Starting local dev environment..."
	docker compose up --build -d
	@echo "Services started."

reset:
	@echo "Stopping and removing containers, volumes"
	docker compose down -v --remove-orphans

test:
	@echo "No tests yet. Add tests under services/* and run them here."

e2e:
	@echo "Run e2e harness (not yet implemented)"

load:
	@echo "Load seeds (not yet implemented)"
