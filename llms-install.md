# AI Assistant Installation Guide for Azure DevOps MCP

This guide provides detailed instructions for AI assistants like Cline to help users set up and configure the Azure DevOps MCP server. The instructions are formatted to be easily parsed by AI assistants for a smooth installation experience.

## Prerequisites

1. Docker installed and running
   - For Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - For Linux: `sudo apt-get install docker.io` (Ubuntu/Debian) or equivalent

2. An Azure DevOps account with:
   - Organization name
   - Project name (optional)
   - Personal Access Token (PAT) with appropriate permissions

## Installation Steps

### 1. Build the Docker Image

Clone the repository and build the Docker image locally:

```bash
git clone https://github.com/aaronsb/ado-mcp.git
cd ado-mcp
./scripts/build-local.sh
```

This will create a Docker image tagged as `ado-mcp:local`.

### 2. Configure Your AI Assistant

This MCP server works with AI assistants that support the Model Context Protocol. Choose the appropriate configuration based on your assistant:

#### For Cline

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
        "ado-mcp:local"
      ],
      "env": {
        "ADO_ORGANIZATION": "your-organization",
        "ADO_PAT": "your-personal-access-token"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

#### For Claude Desktop

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
        "ado-mcp:local"
      ],
      "env": {
        "ADO_ORGANIZATION": "your-organization",
        "ADO_PAT": "your-personal-access-token"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 3. Required Environment Variables

Replace the following values in your configuration:

- `ADO_ORGANIZATION`: Your Azure DevOps organization name
- `ADO_PROJECT`: Your Azure DevOps project name (optional)
- `ADO_PAT`: Your Personal Access Token

### 4. Creating a Personal Access Token (PAT)

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

### 5. Verification

To verify the installation:

1. Restart your AI assistant to load the new configuration
2. The MCP server should connect automatically
3. Test with a simple command like listing projects:

```
Can you list my Azure DevOps projects?
```

Your AI assistant should be able to use the MCP server to list your projects and display the results.

## Local Development Setup

If you prefer to run the MCP server locally without Docker:

### Prerequisites

- Node.js 20 or later
- npm

### Setup Steps

1. Clone the repository:
```bash
git clone https://github.com/aaronsb/ado-mcp.git
cd ado-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example config:
```bash
cp config/azuredevops.example.json config/azuredevops.json
```

4. Edit `config/azuredevops.json` with your Azure DevOps credentials:
```json
{
  "organization": "your-organization",
  "project": "your-project",
  "credentials": {
    "pat": "your-personal-access-token"
  }
}
```

5. Build the project:
```bash
npm run build
```

6. Configure your AI assistant to use the local build:

```json
{
  "mcpServers": {
    "ado-mcp": {
      "command": "node",
      "args": [
        "/path/to/ado-mcp/build/index.js"
      ],
      "autoApprove": [],
      "disabled": false
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify Docker is running
   - Check your Azure DevOps credentials
   - Ensure your organization name is correct
   - Solution: `docker ps` to check if Docker is running, verify credentials in your config

2. **Authentication Error**
   - Double-check your PAT
   - Verify your PAT has the required permissions
   - Check if your PAT has expired
   - Solution: Generate a new PAT with the correct permissions

3. **Docker Image Not Found**
   - Make sure you've built the image with `./scripts/build-local.sh`
   - Check your internet connection
   - Solution: Verify Docker is running with `docker --version`

4. **Permission Issues**
   - Ensure your PAT has the appropriate permissions
   - Solution: Generate a new PAT with the correct permissions

### Getting Help

If you encounter issues:

1. Check the Docker logs:
   ```bash
   docker logs $(docker ps | grep ado-mcp | awk '{print $1}')
   ```

2. File an issue on GitHub with:
   - Error message (without sensitive information)
   - Steps to reproduce
   - Your environment details (OS, Docker version)

## Security Considerations

- Store your PAT securely
- Consider using environment variables instead of hardcoding credentials
- Use a dedicated PAT with appropriate permissions
- Regularly rotate PATs for security
- Set an appropriate expiration date for your PAT

## Quick Reference

| Tool | Description | Example |
|------|-------------|---------|
| list_projects | List Azure DevOps projects | `{}` |
| get_project | Get project details | `{ "project": "MyProject" }` |
| list_work_items | List work items | `{ "query": "SELECT * FROM WorkItems WHERE [System.State] = 'Active'" }` |
| get_work_item | Get work item details | `{ "id": 12345 }` |
| create_work_item | Create a new work item | `{ "type": "Task", "title": "New Task", "description": "Task description" }` |
| list_repositories | List repositories | `{ "project": "MyProject" }` |
| list_pull_requests | List pull requests | `{ "repository": "MyRepo", "status": "active" }` |
| list_branches | List branches | `{ "repository": "MyRepo" }` |
| list_pipelines | List pipelines | `{ "project": "MyProject" }` |
