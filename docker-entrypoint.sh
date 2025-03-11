#!/bin/sh
set -e

# Check if config file exists, if not create from example
if [ ! -f "/app/config/azuredevops.json" ]; then
    echo "No config file found, creating from example..." >&2
    cp /app/config/azuredevops.example.json /app/config/azuredevops.json
    
    # Replace placeholders with environment variables if provided
    if [ ! -z "$ADO_ORGANIZATION" ]; then
        sed -i "s/your-organization/$ADO_ORGANIZATION/g" /app/config/azuredevops.json
    fi
    if [ ! -z "$ADO_PROJECT" ]; then
        sed -i "s/your-project/$ADO_PROJECT/g" /app/config/azuredevops.json
    fi
    if [ ! -z "$ADO_PAT" ]; then
        sed -i "s/your-personal-access-token/$ADO_PAT/g" /app/config/azuredevops.json
    fi
fi

# Start the MCP server
exec node build/index.js
