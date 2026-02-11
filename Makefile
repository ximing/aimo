.PHONY: help install dev build build-web build-server build-docker clean lint lint-fix test

help:
	@echo "Available commands:"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Start development server"
	@echo "  make dev:web          - Start web development server"
	@echo "  make dev:server       - Start server development server"
	@echo "  make build            - Build web and server for production"
	@echo "  make build-web        - Build web only"
	@echo "  make build-server     - Build server only"
	@echo "  make build-docker     - Build Docker image locally"
	@echo "  make lint             - Run linter"
	@echo "  make lint-fix         - Fix linting issues"
	@echo "  make docker-run       - Run Docker container"
	@echo "  make docker-stop      - Stop Docker container"
	@echo "  make clean            - Clean build artifacts"

install:
	pnpm install

dev:
	pnpm dev

dev:web:
	pnpm --filter @aimo/web dev

dev:server:
	pnpm --filter @aimo/server dev

build: build-web build-server
	@echo "✅ Build complete!"

build-web:
	@echo "Building web application..."
	pnpm --filter @aimo/web build

build-server:
	@echo "Building server..."
	pnpm --filter @aimo/server build

build-docker:
	@echo "Building Docker image..."
	docker build -t aimo:latest .

docker-run: build-docker
	@echo "Running Docker container..."
	docker run -p 3000:3000 \
		--env-file .env \
		--name aimo-app \
		aimo:latest

docker-stop:
	@echo "Stopping Docker container..."
	docker stop aimo-app || true
	docker rm aimo-app || true

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

clean:
	@echo "Cleaning build artifacts..."
	rm -rf apps/server/dist
	rm -rf apps/server/public
	rm -rf apps/web/dist
	rm -rf packages/dto/dist
	rm -rf node_modules
	find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Clean complete!"

# Advanced Docker commands
docker-build-push: build-docker
	@echo "Building and pushing Docker image..."
	docker tag aimo:latest $(IMAGE_NAME):latest
	docker push $(IMAGE_NAME):latest

docker-compose-up:
	docker-compose -f docker-compose.prod.yml up -d

docker-compose-down:
	docker-compose -f docker-compose.prod.yml down

docker-compose-logs:
	docker-compose -f docker-compose.prod.yml logs -f

# Verification commands
verify-build: build
	@echo "✅ Build verification passed"
	@test -f apps/server/dist/index.js || (echo "❌ Server build missing" && exit 1)
	@test -f apps/server/public/index.html || (echo "❌ Web build missing" && exit 1)
	@echo "✅ All artifacts present"

verify-docker: build-docker
	@echo "✅ Docker image built successfully"
	@docker images | grep aimo:latest

.DEFAULT_GOAL := help
