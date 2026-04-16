#!/bin/bash
set -euo pipefail

echo "Starting n8n AI Workflow environment..."
echo "========================================"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running."
    echo "Start Docker Desktop (macOS/Windows) or the Docker daemon (Linux)."
    exit 1
fi

cd "$(dirname "$0")"

# Check .env exists
if [ ! -f .env ]; then
    echo "ERROR: No .env file found."
    echo "Run: cp .env.example .env"
    echo "Then edit .env with your API keys."
    exit 1
fi

# Load env for display
set -a
source .env
set +a

# Create directories
mkdir -p n8n-data workflows credentials

# Copy workflow files for n8n volume mount
cp ../workflows/*.json workflows/ 2>/dev/null || true

# Start containers
echo "Starting containers..."
docker compose up -d

# Wait for n8n
echo "Waiting for n8n to start..."
for i in $(seq 1 30); do
    if curl -s http://localhost:5678 > /dev/null 2>&1; then
        echo ""
        echo "n8n is running at http://localhost:5678"
        echo "Username: ${N8N_BASIC_AUTH_USER:-see .env}"
        echo "Password: see .env"
        echo ""
        echo "Next steps:"
        echo "  1. Open http://localhost:5678"
        echo "  2. Log in"
        echo "  3. Import workflow JSONs from the workflows/ directory"
        echo "  4. Configure credentials (Gemini API key, etc.)"
        echo "  5. Activate the workflow"
        echo ""
        echo "Logs:  docker compose logs -f"
        echo "Stop:  docker compose down"
        exit 0
    fi
    printf "."
    sleep 2
done

echo ""
echo "n8n may still be starting. Check: docker compose logs n8n"
