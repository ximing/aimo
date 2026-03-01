# GitHub Actions Workflows

This directory contains all CI/CD workflows for the AIMO project.

## Workflows Overview

### 1. ci.yml - Continuous Integration

**Triggers:**
- Push to `master`, `main`, or `develop` branches
- Pull requests to `master` or `main` branches

**Jobs:**

#### Lint
- Runs ESLint across all packages
- Ensures code style consistency

#### Typecheck
- Type-checks server code (`apps/server`)
- Type-checks web code (`apps/web`)
- Builds DTO package first (required dependency)

#### Test
- Runs Jest tests in `apps/server`
- Spins up MySQL 8.0 service container
- Sets up test database with credentials
- Ensures all tests pass before deployment

#### Build
- Runs after lint, typecheck, and test pass
- Builds all packages using Turbo
- Uploads build artifacts (dist directories)
- Retention: 7 days

#### Docker Build Test (PR only)
- Tests both Dockerfiles build successfully
- Matrix strategy: tests `Dockerfile` and `Dockerfile.migrate`
- Only runs on pull requests
- Does not push images (test only)

### 2. docker-build.yml - Main Application Docker Image

**Triggers:**
- Push to `master`, `main`, or `develop` branches
- Push tags matching `v*.*.*` (e.g., v1.0.0)
- Changes to:
  - `apps/**`
  - `packages/**`
  - `Dockerfile`
  - `.github/workflows/docker-build.yml`
- Pull requests to `master` or `main`
- Manual workflow dispatch (with optional custom tag)

**What it does:**
- Builds multi-platform Docker image (linux/amd64, linux/arm64)
- Pushes to GitHub Container Registry (ghcr.io)
- Generates artifact attestation for security
- Creates multiple tags:
  - Branch name (e.g., `master`, `develop`)
  - Commit SHA (e.g., `master-abc1234`)
  - Semver tags (e.g., `1.0.0`, `1.0`)
  - `latest` and `stable` for default branch
  - Custom tag if provided via workflow_dispatch

**Image name:** `ghcr.io/ximing/aimo`

**Example usage:**
```bash
docker pull ghcr.io/ximing/aimo:latest
docker pull ghcr.io/ximing/aimo:stable
docker pull ghcr.io/ximing/aimo:v1.0.0
```

### 3. docker-migrate.yml - Migration Docker Image

**Triggers:**
- Push to `master`, `main`, or `develop` branches
- Changes to:
  - `apps/server/**`
  - `packages/dto/**`
  - `packages/logger/**`
  - `Dockerfile.migrate`
  - `.github/workflows/docker-migrate.yml`
- Pull requests to `master` or `main`
- Manual workflow dispatch (with optional custom tag)

**What it does:**
- Builds migration-specific Docker image
- Includes dev dependencies (drizzle-kit, tsx)
- Multi-platform support (linux/amd64, linux/arm64)
- Pushes to GitHub Container Registry

**Image name:** `ghcr.io/ximing/aimo-migrate`

**Example usage:**
```bash
# Pull migration image
docker pull ghcr.io/ximing/aimo-migrate:latest

# Run schema migrations
docker run --rm --network aimo-network \
  -e MYSQL_HOST=mysql \
  -e MYSQL_USER=aimo \
  -e MYSQL_PASSWORD=password \
  -e MYSQL_DATABASE=aimo \
  ghcr.io/ximing/aimo-migrate:latest \
  node apps/server/dist/scripts/docker-migrate.js migrate

# Run data migration
docker run --rm --network aimo-network \
  -e MYSQL_HOST=mysql \
  -e MYSQL_USER=aimo \
  -e MYSQL_PASSWORD=password \
  -e MYSQL_DATABASE=aimo \
  -v $(pwd)/lancedb_data:/app/lancedb_data \
  ghcr.io/ximing/aimo-migrate:latest \
  node apps/server/dist/scripts/docker-migrate.js migrate-data
```

### 4. build-electron.yml - Electron Desktop App

**Triggers:**
- Push tags matching `v*` (e.g., v1.0.0)
- Manual workflow dispatch

**What it does:**
- Builds Electron desktop application
- Multi-platform: macOS (x64, arm64), Windows (x64), Linux (x64)
- Creates installers and portable versions
- Uploads release artifacts to GitHub Releases

**Artifacts:**
- macOS: `.dmg` files (Intel and Apple Silicon)
- Windows: `.exe` installer
- Linux: AppImage, `.deb`, `.rpm`

### 5. docker-publish.yml - Legacy Docker Publish

**Note:** This workflow may be superseded by `docker-build.yml` and `docker-migrate.yml`.

**Triggers:**
- Push tags matching `v*` (e.g., v1.0.0)
- Manual workflow dispatch

**What it does:**
- Builds and publishes Docker image to GitHub Container Registry
- Single-platform build

## Workflow Dependencies

```
ci.yml (on PR):
  lint ──┐
  typecheck ──┼──> build ──> docker-build-test
  test ──┘

docker-build.yml (on push):
  Triggered automatically → builds and pushes image

docker-migrate.yml (on push):
  Triggered automatically → builds and pushes migration image
```

## Manual Workflow Dispatch

### Trigger Docker Build with Custom Tag

```bash
# Via GitHub UI:
# 1. Go to Actions tab
# 2. Select "Build and Push Docker Image" workflow
# 3. Click "Run workflow"
# 4. Enter custom tag (e.g., "hotfix-123")

# Via GitHub CLI:
gh workflow run docker-build.yml -f tag=hotfix-123
```

### Trigger Migration Image Build

```bash
gh workflow run docker-migrate.yml -f tag=hotfix-migration
```

## Secrets Required

All workflows use `GITHUB_TOKEN` (automatically provided by GitHub Actions).

No additional secrets needed for:
- CI/CD workflows
- Docker builds
- Artifact uploads

## Caching Strategy

All workflows use GitHub Actions cache:

- **pnpm cache**: `node_modules` dependencies
- **Docker cache**: `type=gha` (GitHub Actions cache)
- **Build artifacts**: Uploaded for 7 days retention

## Best Practices

### For Contributors

1. **Always create PRs**: This triggers the full CI pipeline
2. **Wait for checks**: All jobs must pass before merging
3. **Fix lint/typecheck**: Don't bypass these checks
4. **Test locally first**: Run `pnpm lint && pnpm test` before pushing

### For Maintainers

1. **Use semantic versioning**: Tag releases as `v1.0.0`, `v1.1.0`, etc.
2. **Monitor workflow runs**: Check Actions tab for failures
3. **Update pnpm version**: Keep `pnpm/action-setup@v4` version in sync with `package.json`
4. **Review Docker builds**: Ensure multi-platform builds succeed

## Troubleshooting

### Workflow Fails on Lint

```bash
# Fix locally
pnpm lint:fix
git add .
git commit -m "fix: lint errors"
git push
```

### Workflow Fails on Typecheck

```bash
# Check types locally
cd apps/server && pnpm typecheck
cd apps/web && pnpm typecheck

# Fix type errors and push
```

### Workflow Fails on Test

```bash
# Run tests locally with MySQL
docker-compose -f docker-compose.migrate.yml up -d mysql
cd apps/server && pnpm test

# Check test logs for failures
```

### Docker Build Fails

```bash
# Test Docker build locally
docker build -f Dockerfile -t test:latest .
docker build -f Dockerfile.migrate -t test-migrate:latest .

# Check Dockerfile syntax and build steps
```

## Performance Optimization

- **Parallel jobs**: `lint`, `typecheck`, and `test` run in parallel
- **Dependency caching**: pnpm and Docker layers cached
- **Conditional execution**: Docker build test only on PRs
- **Artifact retention**: 7 days (configurable)

## Future Improvements

- [ ] Add code coverage reporting
- [ ] Add performance benchmarks
- [ ] Add security scanning (Dependabot, Snyk)
- [ ] Add automated release notes generation
- [ ] Add deployment to staging/production environments
