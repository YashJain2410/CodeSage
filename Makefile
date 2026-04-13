dev:
	docker compose -f infra/docker-compose.yml up

test:
	pytest backend/tests

lint:
	ruff check backend