#!/bin/bash
set -e

# This script runs the Azure DevOps MCP server locally for development and testing

# Parse command line arguments
CONFIG_PATH=""
INTERACTIVE=true
USE_DOCKER=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --config) CONFIG_PATH="$2"; shift ;;
        --non-interactive) INTERACTIVE=false ;;
        --docker) USE_DOCKER=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Setup colored output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ "$USE_DOCKER" = true ]; then
    # Docker mode - similar to original run-local.sh
    
    # Check if the Docker image exists
    if ! docker image inspect azure-devops-mcp:local &>/dev/null; then
        echo "Local Docker image not found. Building it first..."
        ./scripts/build-local.sh
    fi
    
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
    echo -e "${GREEN}Starting Azure DevOps MCP server in Docker...${NC}"
    
    if [ "$INTERACTIVE" = true ]; then
        # Interactive mode with TTY
        docker run --rm -it "${ENV_VARS[@]}" "${VOLUMES[@]}" azure-devops-mcp:local
    else
        # Non-interactive mode
        docker run --rm "${ENV_VARS[@]}" "${VOLUMES[@]}" azure-devops-mcp:local
    fi
else
    # Node.js mode - direct execution
    
    # Check if build exists
    if [ ! -f "build/index.js" ]; then
        echo "Build not found. Running build script first..."
        ./scripts/build-local.sh
    fi
    
    # Set environment variables if config is provided
    if [ -n "$CONFIG_PATH" ] && [ -f "$CONFIG_PATH" ]; then
        echo -e "${BLUE}Using config:${NC} $CONFIG_PATH"
        
        # Use jq to extract values if available, otherwise use grep
        if command -v jq &>/dev/null; then
            export ADO_ORGANIZATION=$(jq -r '.organization // ""' "$CONFIG_PATH")
            export ADO_PROJECT=$(jq -r '.project // ""' "$CONFIG_PATH")
            export ADO_PAT=$(jq -r '.credentials.pat // ""' "$CONFIG_PATH")
            
            # Extract API settings if they exist
            if jq -e '.api' "$CONFIG_PATH" &>/dev/null; then
                export ADO_API_URL=$(jq -r '.api.baseUrl // ""' "$CONFIG_PATH")
                export ADO_API_VERSION=$(jq -r '.api.version // ""' "$CONFIG_PATH")
                
                # Extract retry settings if they exist
                if jq -e '.api.retry' "$CONFIG_PATH" &>/dev/null; then
                    export ADO_API_MAX_RETRIES=$(jq -r '.api.retry.maxRetries // ""' "$CONFIG_PATH")
                    export ADO_API_DELAY_MS=$(jq -r '.api.retry.delayMs // ""' "$CONFIG_PATH")
                    export ADO_API_BACKOFF_FACTOR=$(jq -r '.api.retry.backoffFactor // ""' "$CONFIG_PATH")
                fi
            fi
        else
            # Fallback to grep if jq is not available
            export ADO_ORGANIZATION=$(grep -o '"organization"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | cut -d'"' -f4)
            export ADO_PROJECT=$(grep -o '"project"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | cut -d'"' -f4)
            export ADO_PAT=$(grep -o '"pat"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_PATH" | cut -d'"' -f4)
        fi
    else
        echo -e "${YELLOW}No config file specified. Using environment variables if set.${NC}"
    fi
    
    # Run the server
    echo -e "${GREEN}Starting Azure DevOps MCP server with Node.js...${NC}"
    node build/index.js
fi
