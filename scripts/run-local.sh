#!/bin/bash
set -e

# This script runs the Azure DevOps MCP server locally for development and testing

# Check if the Docker image exists
if ! docker image inspect azure-devops-mcp:local &>/dev/null; then
    echo "Local Docker image not found. Building it first..."
    ./scripts/build-local.sh
fi

# Parse command line arguments
CONFIG_PATH=""
INTERACTIVE=true

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --config) CONFIG_PATH="$2"; shift ;;
        --non-interactive) INTERACTIVE=false ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Setup colored output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine config path
if [ -z "$CONFIG_PATH" ]; then
    if [ -f "./config/azuredevops.json" ]; then
        CONFIG_PATH="./config/azuredevops.json"
        echo -e "${BLUE}Using config:${NC} $CONFIG_PATH"
    else
        echo -e "${YELLOW}No config file found. Using environment variables or example config.${NC}"
    fi
else
    echo -e "${BLUE}Using config:${NC} $CONFIG_PATH"
fi

# Extract environment variables from config if it exists
if [ -n "$CONFIG_PATH" ] && [ -f "$CONFIG_PATH" ]; then
    # Use jq to extract values if available, otherwise use grep
    if command -v jq &>/dev/null; then
        ORGANIZATION=$(jq -r '.organization // "your-organization"' "$CONFIG_PATH")
        PROJECT=$(jq -r '.project // "your-project"' "$CONFIG_PATH")
        PAT=$(jq -r '.credentials.pat // "your-personal-access-token"' "$CONFIG_PATH")
    else
        ORGANIZATION=$(grep -o '"organization"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | cut -d'"' -f4)
        PROJECT=$(grep -o '"project"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | cut -d'"' -f4)
        PAT=$(grep -o '"pat"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | cut -d'"' -f4)
    fi
fi

# Set environment variables for Docker
ENV_VARS=()
if [ -n "$ORGANIZATION" ] && [ "$ORGANIZATION" != "your-organization" ]; then
    ENV_VARS+=("-e" "ADO_ORGANIZATION=$ORGANIZATION")
fi
if [ -n "$PROJECT" ] && [ "$PROJECT" != "your-project" ]; then
    ENV_VARS+=("-e" "ADO_PROJECT=$PROJECT")
fi
if [ -n "$PAT" ] && [ "$PAT" != "your-personal-access-token" ]; then
    ENV_VARS+=("-e" "ADO_PAT=$PAT")
fi

# Add config volume if config path is specified
VOLUMES=()
if [ -n "$CONFIG_PATH" ] && [ -f "$CONFIG_PATH" ]; then
    CONFIG_DIR=$(dirname "$CONFIG_PATH")
    CONFIG_FILE=$(basename "$CONFIG_PATH")
    VOLUMES+=("-v" "$CONFIG_DIR:/app/config")
fi

# Run the Docker container
echo -e "${GREEN}Starting Azure DevOps MCP server...${NC}"

if [ "$INTERACTIVE" = true ]; then
    # Interactive mode with TTY
    docker run --rm -it "${ENV_VARS[@]}" "${VOLUMES[@]}" azure-devops-mcp:local
else
    # Non-interactive mode
    docker run --rm "${ENV_VARS[@]}" "${VOLUMES[@]}" azure-devops-mcp:local
fi
