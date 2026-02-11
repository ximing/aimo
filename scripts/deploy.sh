#!/bin/bash

# Deployment Script for AIMO Application
# Supports local Docker and docker-compose deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_TYPE="${1:-local}"
CONTAINER_NAME="aimo-app"
IMAGE_NAME="aimo:latest"
PORT="${PORT:-3000}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AIMO Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Deployment Type: ${YELLOW}${DEPLOY_TYPE}${NC}"
echo ""

# Function to check if .env file exists
check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ .env file not found${NC}"
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your actual values${NC}"
        exit 1
    fi
}

# Function to stop existing container
stop_container() {
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${YELLOW}Stopping existing container...${NC}"
        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true
        echo -e "${GREEN}✅ Container stopped${NC}"
    fi
}

# Function to build image
build_image() {
    echo -e "\n${YELLOW}Building Docker image...${NC}"
    docker build -t "$IMAGE_NAME" .
    echo -e "${GREEN}✅ Docker image built${NC}"
}

# Function to deploy with docker run
deploy_docker_run() {
    echo -e "\n${YELLOW}Deploying with 'docker run'...${NC}"
    
    check_env
    build_image
    stop_container
    
    echo -e "\n${YELLOW}Starting container...${NC}"
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "$PORT:3000" \
        --env-file .env \
        --health-interval 30s \
        --health-timeout 10s \
        --health-start-period 5s \
        --health-retries 3 \
        "$IMAGE_NAME"
    
    echo -e "${GREEN}✅ Container started${NC}"
    sleep 2
    
    # Check container status
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${GREEN}✅ Container is running${NC}"
        CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_NAME")
        echo -e "Container IP: ${YELLOW}${CONTAINER_IP}${NC}"
        echo -e "Access application at: ${YELLOW}http://localhost:${PORT}${NC}"
    else
        echo -e "${RED}❌ Container failed to start${NC}"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
}

# Function to deploy with docker-compose
deploy_docker_compose() {
    echo -e "\n${YELLOW}Deploying with 'docker-compose'...${NC}"
    
    check_env
    
    if [ ! -f "docker-compose.prod.yml" ]; then
        echo -e "${RED}❌ docker-compose.prod.yml not found${NC}"
        exit 1
    fi
    
    # Stop existing services
    docker-compose -f docker-compose.prod.yml down || true
    
    # Build and start
    echo -e "${YELLOW}Building and starting services...${NC}"
    docker-compose -f docker-compose.prod.yml up -d
    
    echo -e "${GREEN}✅ Services started${NC}"
    sleep 3
    
    # Check service status
    if docker-compose -f docker-compose.prod.yml ps | grep -q "aimo-app"; then
        echo -e "${GREEN}✅ Services are running${NC}"
        docker-compose -f docker-compose.prod.yml ps
        echo -e "Access application at: ${YELLOW}http://localhost:${PORT}${NC}"
    else
        echo -e "${RED}❌ Services failed to start${NC}"
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
}

# Function to test deployment
test_deployment() {
    echo -e "\n${YELLOW}Testing deployment...${NC}"
    
    echo -e "Waiting for application to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:$PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Application is responding${NC}"
            
            # Test static files
            if curl -s http://localhost:$PORT | grep -q "<!DOCTYPE"; then
                echo -e "${GREEN}✅ HTML content served${NC}"
            else
                echo -e "${YELLOW}⚠️  No HTML content found${NC}"
            fi
            
            return 0
        fi
        echo -n "."
        sleep 1
    done
    
    echo -e "\n${RED}❌ Application not responding${NC}"
    echo -e "${YELLOW}Check logs with:${NC}"
    if [ "$DEPLOY_TYPE" = "docker-compose" ]; then
        echo "docker-compose -f docker-compose.prod.yml logs -f"
    else
        echo "docker logs -f $CONTAINER_NAME"
    fi
    return 1
}

# Function to show status
show_status() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Deployment Status${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ "$DEPLOY_TYPE" = "docker-compose" ]; then
        docker-compose -f docker-compose.prod.yml ps
    else
        docker ps | grep "$CONTAINER_NAME" || echo "Container not running"
    fi
}

# Main deployment logic
case "$DEPLOY_TYPE" in
    "docker-run")
        deploy_docker_run
        ;;
    "docker-compose")
        deploy_docker_compose
        ;;
    "local")
        echo -e "${YELLOW}Checking if Docker Compose file exists...${NC}"
        if [ -f "docker-compose.prod.yml" ]; then
            deploy_docker_compose
        else
            deploy_docker_run
        fi
        ;;
    "stop")
        echo -e "${YELLOW}Stopping deployment...${NC}"
        stop_container
        echo -e "${GREEN}✅ Stopped${NC}"
        exit 0
        ;;
    "logs")
        if [ "$2" = "compose" ] && [ -f "docker-compose.prod.yml" ]; then
            docker-compose -f docker-compose.prod.yml logs -f
        else
            docker logs -f "$CONTAINER_NAME"
        fi
        exit 0
        ;;
    *)
        echo -e "${YELLOW}Usage:${NC}"
        echo "  $0                    - Deploy locally (auto-detect method)"
        echo "  $0 docker-run         - Deploy with 'docker run'"
        echo "  $0 docker-compose     - Deploy with 'docker-compose'"
        echo "  $0 stop               - Stop deployment"
        echo "  $0 logs               - Show container logs"
        echo "  $0 logs compose       - Show docker-compose logs"
        exit 1
        ;;
esac

# Run tests if deployment was successful
if test_deployment; then
    show_status
    
    echo -e "\n${GREEN}✅ Deployment completed successfully${NC}"
    echo -e "\n${YELLOW}Useful commands:${NC}"
    if [ "$DEPLOY_TYPE" = "docker-compose" ]; then
        echo "  View logs:    docker-compose -f docker-compose.prod.yml logs -f"
        echo "  Stop:         docker-compose -f docker-compose.prod.yml down"
        echo "  Restart:      docker-compose -f docker-compose.prod.yml restart"
    else
        echo "  View logs:    docker logs -f $CONTAINER_NAME"
        echo "  Stop:         docker stop $CONTAINER_NAME"
        echo "  Restart:      docker restart $CONTAINER_NAME"
    fi
else
    echo -e "\n${RED}❌ Deployment failed during testing${NC}"
    exit 1
fi
