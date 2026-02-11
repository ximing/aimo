#!/bin/bash

# Production Build Verification Script
# This script verifies that the production build and Docker image are properly configured

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production Build Verification${NC}"
echo -e "${BLUE}========================================${NC}"

# Check Node.js
echo -e "\n${YELLOW}1. Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

# Check pnpm
echo -e "\n${YELLOW}2. Checking pnpm...${NC}"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✅ pnpm ${PNPM_VERSION}${NC}"
else
    echo -e "${RED}❌ pnpm not found${NC}"
    exit 1
fi

# Check Docker
echo -e "\n${YELLOW}3. Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ ${DOCKER_VERSION}${NC}"
else
    echo -e "${RED}❌ Docker not found${NC}"
    exit 1
fi

# Check essential files
echo -e "\n${YELLOW}4. Checking essential files...${NC}"
REQUIRED_FILES=(
    "Dockerfile"
    ".dockerignore"
    "docker-compose.prod.yml"
    ".env.example"
    "apps/server/package.json"
    "apps/web/package.json"
    "packages/dto/package.json"
    ".github/workflows/docker-publish.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file not found${NC}"
        exit 1
    fi
done

# Check .env file
echo -e "\n${YELLOW}5. Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    if grep -q "JWT_SECRET" .env; then
        echo -e "${GREEN}✅ JWT_SECRET configured${NC}"
    else
        echo -e "${YELLOW}⚠️  JWT_SECRET not found in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found, creating from .env.example${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env created from .env.example${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with your actual values${NC}"
fi

# Optional: Build verification (only if BUILD_CHECK=true)
if [ "$BUILD_CHECK" = "true" ]; then
    echo -e "\n${YELLOW}6. Building application...${NC}"
    
    echo -e "Installing dependencies..."
    pnpm install --frozen-lockfile
    
    echo -e "Building DTO package..."
    pnpm --filter @aimo/dto build
    
    echo -e "Building Web application..."
    pnpm --filter @aimo/web build
    
    echo -e "Building Server application..."
    pnpm --filter @aimo/server build
    
    # Verify build artifacts
    echo -e "\n${YELLOW}7. Verifying build artifacts...${NC}"
    if [ -f "apps/server/dist/index.js" ]; then
        echo -e "${GREEN}✅ Server build artifact exists${NC}"
    else
        echo -e "${RED}❌ Server build artifact not found${NC}"
        exit 1
    fi
    
    if [ -f "apps/server/public/index.html" ]; then
        echo -e "${GREEN}✅ Web build artifact exists${NC}"
    else
        echo -e "${RED}❌ Web build artifact not found${NC}"
        exit 1
    fi
fi

# Optional: Docker image build (only if DOCKER_BUILD=true)
if [ "$DOCKER_BUILD" = "true" ]; then
    echo -e "\n${YELLOW}8. Building Docker image...${NC}"
    docker build -t aimo:latest .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker image built successfully${NC}"
        docker images | grep aimo:latest
    else
        echo -e "${RED}❌ Docker image build failed${NC}"
        exit 1
    fi
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Production Setup Verification Complete${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update .env file with your production configuration"
echo "2. Build the application: pnpm build"
echo "3. Build Docker image: make build-docker"
echo "4. Run with Docker: make docker-run"
echo ""
echo -e "${YELLOW}Or use environment variables to run full verification:${NC}"
echo "BUILD_CHECK=true DOCKER_BUILD=true ./scripts/verify-production.sh"
