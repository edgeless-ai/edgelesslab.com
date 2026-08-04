#!/bin/bash
#
# Docker Deployment Validation Script
# Validates that the YouTube Intelligence Pipeline Docker deployment is working correctly
#

set -e

echo "=== YouTube Intelligence Pipeline - Docker Deployment Validation ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check prerequisites
info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
fi
success "Docker is installed"

if ! docker info &> /dev/null; then
    error "Docker daemon is not running"
fi
success "Docker daemon is running"

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
fi
success "Docker Compose is installed"

echo ""
info "Building Docker image..."
docker build -t youtube-intelligence:latest . > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    success "Docker image built successfully"
else
    error "Docker build failed (see /tmp/build.log)"
fi

echo ""
# Preflight: this stack asserts its API on :8000, same port as the canonical
# launchd chroma-server. Refuse to start if :8000 is already owned, to avoid the
# split-brain that bit us 2026-08-04.
if lsof -nP -iTCP:8000 -sTCP:LISTEN 2>/dev/null | grep -q LISTEN; then
    error "Port 8000 is already in use (likely the canonical chroma-server). Aborting to avoid a split-brain. Free :8000 or point this stack at another port first."
fi

info "Starting container with docker-compose..."
docker-compose up -d > /tmp/compose.log 2>&1
if [ $? -eq 0 ]; then
    success "Container started with docker-compose"
else
    error "docker-compose up failed (see /tmp/compose.log)"
fi

echo ""
info "Waiting for container to be healthy..."
sleep 10

# Check container status
STATUS=$(docker inspect --format='{{.State.Health.Status}}' youtube-intelligence-api 2>/dev/null || echo "unknown")
if [ "$STATUS" = "healthy" ]; then
    success "Container is healthy"
else
    error "Container health check failed (status: $STATUS)"
fi

echo ""
info "Testing API endpoints..."

# Test health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$HTTP_CODE" = "200" ]; then
    success "Health endpoint responding (HTTP $HTTP_CODE)"
else
    error "Health endpoint failed (HTTP $HTTP_CODE)"
fi

# Test docs endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs)
if [ "$HTTP_CODE" = "200" ]; then
    success "Docs endpoint responding (HTTP $HTTP_CODE)"
else
    error "Docs endpoint failed (HTTP $HTTP_CODE)"
fi

# Test tenant creation
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    'http://localhost:8000/api/v1/tenants' \
    -H 'Content-Type: application/json' \
    -H 'X-API-Key: dev-key-123' \
    -d '{"tenant_id": "validation-test", "name": "Validation Test"}')
if [ "$HTTP_CODE" = "200" ]; then
    success "Tenant creation working (HTTP $HTTP_CODE)"
else
    error "Tenant creation failed (HTTP $HTTP_CODE)"
fi

# Test tenant listing
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    'http://localhost:8000/api/v1/tenants' \
    -H 'X-API-Key: dev-key-123')
if [ "$HTTP_CODE" = "200" ]; then
    success "Tenant listing working (HTTP $HTTP_CODE)"
else
    error "Tenant listing failed (HTTP $HTTP_CODE)"
fi

echo ""
info "Testing data persistence..."

# Check if data directory exists
if [ -d "./data/tenants/validation-test" ]; then
    success "Tenant data directory created"
else
    error "Tenant data directory not found"
fi

echo ""
info "Cleaning up..."
docker-compose down > /dev/null 2>&1
success "Containers stopped and removed"

echo ""
echo -e "${GREEN}=== All validation tests passed! ===${NC}"
echo ""
echo "Docker deployment is ready for:"
echo "  - Local development"
echo "  - Production deployment"
echo "  - Cloud platform deployment"
echo ""
echo "Quick commands:"
echo "  Start: docker-compose up -d"
echo "  Logs:  docker-compose logs -f api"
echo "  Stop:  docker-compose down"
echo ""
echo "API Documentation: http://localhost:8000/docs"
