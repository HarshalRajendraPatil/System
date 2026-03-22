SHELL := /bin/bash

.PHONY: local-up local-down local-logs client-build server-build tf-init tf-plan tf-apply

local-up:
	docker compose up -d --build

local-down:
	docker compose down

local-logs:
	docker compose logs -f --tail=200

client-build:
	docker build -t grindforge-client:local --build-arg VITE_API_BASE_URL=/api/v1 ./Client

server-build:
	docker build -t grindforge-server:local ./Server

tf-init:
	cd infra/terraform && terraform init

tf-plan:
	cd infra/terraform && terraform plan

tf-apply:
	cd infra/terraform && terraform apply
