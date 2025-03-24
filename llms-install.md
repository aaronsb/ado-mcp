# AI Assistant Installation Guide for Azure DevOps MCP

This guide provides detailed instructions for AI assistants like Cline to help users set up and configure the Azure DevOps MCP server. The instructions are formatted to be easily parsed by AI assistants for a smooth, one-click installation experience.

## One-Click Installation for AI Assistants

As an AI assistant, you can help users install this MCP server with minimal effort by following these steps:

1. Ask the user for their Azure DevOps organization name and PAT (Personal Access Token)
2. Determine which AI assistant platform they're using (Cline, Claude Desktop, etc.)
3. Provide the appropriate configuration snippet with their credentials pre-filled
4. Guide them through saving the configuration to the correct location
5. Verify the installation by testing a simple command

This structured approach ensures a seamless installation experience with minimal user effort.

## Prerequisites

The user will need:

1. An Azure DevOps account with:
   - Organization name
   - Project name (optional)
   - Personal Access Token (PAT) with appropriate permissions

2. For Docker installation (recommended):
   - Docker installed and running
   - For Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - For Linux: `sudo apt-get install docker.io` (Ubuntu/Debian) or equivalent

3. For Node.js installation (alternative):
   - Node.js 20 or later
   - npm

## Installation Options

There are two ways to install the Azure DevOps MCP server:

### Option 1: Docker Installation (Recommended)

This method is simpler and isolates dependencies:

1. Clone the repository and build the Docker image:

```bash
git clone https://github.com/aaronsb/ado-mcp.git
cd ado-mcp
./scripts/build-local.sh
```

This creates a Docker image tagged as `ado-mcp:local`.

### Option 2: Node.js Installation

This method runs the server directly without Docker:

1. Clone the repository:
```bash
git clone https://github.com/aaronsb/ado-mcp.git
cd ado-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configure Your AI Assistant

This MCP server works with AI assistants that support the Model Context Protocol. Choose the appropriate configuration based on your assistant and installation method:

### For Cline

#### Docker Installation

Edit: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "ADO_ORGANIZATION",
        "-e",
        "ADO_PAT",
        "-e",
        "ADO_PROJECT",
        "ado-mcp:local"
      ],
      "env": {
        "ADO_ORGANIZATION": "your-organization",
        "ADO_PAT": "your-personal-access-token",
        "ADO_PROJECT": "your-project-name"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### Node.js Installation

Edit: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "node",
      "args": [
        "/path/to/ado-mcp/build/index.js"
      ],
      "env": {
        "ADO_ORGANIZATION": "your-organization",
        "ADO_PAT": "your-personal-access-token",
        "ADO_PROJECT": "your-project-name"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### For Claude Desktop

#### Docker Installation

Edit: `~/.config/Claude/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "ADO_ORGANIZATION",
        "-e",
        "ADO_PAT",
        "-e",
        "ADO_PROJECT",
        "ado-mcp:local"
      ],
      "env": {
        "ADO_ORGANIZATION": "your-organization",
        "ADO_PAT": "your-personal-access-token",
        "ADO_PROJECT": "your-project-name"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### Node.js Installation

Edit: `~/.config/Claude/claude_desktop_config.json` (Linux/Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "node",
      "args": [
        "/path/to/ado-mcp/build/index.js"
      ],
      "env": {
        "ADO_ORGANIZATION": "your-organization",
        "ADO_PAT": "your-personal-access-token",
        "ADO_PROJECT": "your-project-name"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Environment Variables

Replace the following values in your configuration:

### Required Variables

- `ADO_ORGANIZATION`: Your Azure DevOps organization name
- `ADO_PAT`: Your Personal Access Token

### Optional Variables

- `ADO_PROJECT`: Default project name (optional)
- `ADO_API_URL`: Base URL for the API (defaults to https://dev.azure.com)
- `ADO_API_VERSION`: API version (defaults to 7.0)
- `ADO_API_MAX_RETRIES`: Maximum number of retries for API calls (defaults to 3)
- `ADO_API_DELAY_MS`: Delay between retries in milliseconds (defaults to 1000)
- `ADO_API_BACKOFF_FACTOR`: Backoff factor for retries (defaults to 2)

## Creating a Personal Access Token (PAT)

1. Go to your Azure DevOps organization: `https://dev.azure.com/your-organization`
2. Click on your profile picture in the top right corner
3. Select "Personal access tokens"
4. Click "New Token"
5. Name your token (e.g., "MCP Server")
6. Set the organization to your organization
7. Set the expiration date (recommended: 90 days)
8. Select the following scopes:
   - Work Items: Read & Write
   - Code: Read & Write
   - Build: Read & Execute
   - Project and Team: Read
9. Click "Create"
10. Copy the generated token (you won't be able to see it again)

## Verification

To verify the installation:

1. Restart your AI assistant to load the new configuration
2. The MCP server should connect automatically
3. Test with a simple command like listing projects:

```
Can you list my Azure DevOps projects?
```

Your AI assistant should be able to use the MCP server to list your projects and display the results.

For more advanced verification, try:

```
Can you show me the work items in my Azure DevOps project?
```

or

```
Can you list the repositories in my Azure DevOps project?
```

## Using Configuration Files (Alternative to Environment Variables)

Instead of using environment variables, you can use a configuration file:

1. Copy the example config:
```bash
cp config/azuredevops.example.json config/azuredevops.json
```

2. Edit `config/azuredevops.json` with your Azure DevOps credentials:
```json
{
  "organization": "your-organization",
  "project": "your-project",
  "credentials": {
    "pat": "your-personal-access-token"
  },
  "api": {
    "baseUrl": "https://dev.azure.com",
    "version": "7.0",
    "retry": {
      "maxRetries": 3,
      "delayMs": 1000,
      "backoffFactor": 2
    }
  }
}
```

3. For Docker installation, mount the config directory:
```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/ado-mcp/config:/app/config",
        "ado-mcp:local"
      ],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

4. For Node.js installation, the server will automatically find the config file in the config directory.

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify Docker is running: `docker ps`
   - Check your Azure DevOps credentials
   - Ensure your organization name is correct
   - Check network connectivity to dev.azure.com
   - Solution: Verify credentials in your config and ensure Docker is running

2. **Authentication Error**
   - Double-check your PAT
   - Verify your PAT has the required permissions
   - Check if your PAT has expired
   - Solution: Generate a new PAT with the correct permissions

3. **Docker Image Not Found**
   - Make sure you've built the image with `./scripts/build-local.sh`
   - Check the image exists: `docker images | grep ado-mcp`
   - Solution: Rebuild the image with `./scripts/build-local.sh`

4. **Permission Issues**
   - Ensure your PAT has the appropriate permissions
   - For Node.js installation, check file permissions on the build directory
   - Solution: Generate a new PAT with the correct permissions

5. **Node.js Version Issues**
   - Check your Node.js version: `node --version`
   - Ensure you're using Node.js 20 or later
   - Solution: Install or upgrade to Node.js 20+

6. **Configuration File Issues**
   - Verify the JSON syntax in your configuration file
   - Check that the file path is correct
   - For Docker, ensure the volume mount path is correct
   - Solution: Validate your JSON with a linter

### Debugging

For Docker installation:
```bash
# Check if the container is running
docker ps | grep ado-mcp

# View container logs
docker logs $(docker ps | grep ado-mcp | awk '{print $1}')

# Run the container with verbose output
docker run -it --rm ado-mcp:local
```

For Node.js installation:
```bash
# Run with debug output
NODE_DEBUG=* node build/index.js

# Check for errors in the build
npm run build -- --verbose
```

### Getting Help

If you encounter issues:

1. Check the logs as described above
2. File an issue on GitHub with:
   - Error message (without sensitive information)
   - Steps to reproduce
   - Your environment details (OS, Docker/Node.js version)
   - Configuration (with credentials removed)

## Security Considerations

- Store your PAT securely
- Consider using environment variables instead of hardcoding credentials
- Use a dedicated PAT with appropriate permissions
- Regularly rotate PATs for security
- Set an appropriate expiration date for your PAT (90 days recommended)
- Use the minimum required permissions for your PAT
- Consider using a separate Azure DevOps account for AI assistant integration

## Available Entity Tools

This MCP server uses an entity-based architecture that groups operations by resource type:

### Projects Tool

Operations:
- `list`: List all projects in the organization with pagination
- `get`: Get detailed information about a specific project

### Repositories Tool

Operations:
- `list`: List all Git repositories in a project
- `get`: Get detailed information about a specific repository
- `listBranches`: List all branches in a repository

### Work Items Tool

Operations:
- `get`: Get detailed information about a specific work item
- `create`: Create a new work item in a project

### Pull Requests Tool

Operations:
- `list`: List pull requests in a repository with filtering
- `get`: Get detailed information about a specific pull request

### Pipelines Tool

Operations:
- `list`: List all pipelines in a project
- `get`: Get detailed information about a specific pipeline

## Quick Reference Examples

| Operation | Example Usage |
|-----------|---------------|
| List Projects | `{ "operation": "list", "listParams": { "maxResults": 10 } }` |
| Get Project | `{ "operation": "get", "getParams": { "projectId": "my-project" } }` |
| List Repositories | `{ "operation": "list", "listParams": { "projectId": "my-project" } }` |
| List Branches | `{ "operation": "listBranches", "listBranchesParams": { "projectId": "my-project", "repositoryId": "my-repo" } }` |
| Get Work Item | `{ "operation": "get", "getParams": { "id": 123 } }` |
| Create Work Item | `{ "operation": "create", "createParams": { "projectId": "my-project", "type": "Task", "title": "New Task" } }` |
| List Pull Requests | `{ "operation": "list", "listParams": { "projectId": "my-project", "repositoryId": "my-repo", "status": "Active" } }` |
| List Pipelines | `{ "operation": "list", "listParams": { "projectId": "my-project" } }` |
