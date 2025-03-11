# Azure DevOps MCP Server

This MCP (Model Context Protocol) server provides tools for interacting with Azure DevOps services through AI assistants.

## Architecture

The server follows an entity-based architecture that groups operations by resource type rather than exposing many atomic tools. This approach provides several benefits:

1. **Intuitive organization**: Tools are organized by the entities they operate on (projects, repositories, work items, etc.)
2. **Reduced tool count**: Instead of dozens of individual tools, we have a handful of entity tools with multiple operations
3. **Consistent interface**: All entity tools follow the same pattern for operations and parameters
4. **Better error handling**: Each entity tool can handle errors specific to its domain
5. **Easier discovery**: Users can easily discover available operations for each entity

### Key Components

- **Entity Tools**: Each tool represents a major Azure DevOps entity (projects, repositories, work items, etc.) and provides multiple operations (list, get, create, etc.)
- **Tool Registry**: Manages the registration and execution of entity tools
- **API Client**: Handles communication with the Azure DevOps REST API
- **Configuration Manager**: Loads and validates configuration from environment variables or config file

## Available Entity Tools

### Projects Tool

Manages Azure DevOps projects.

Operations:
- `list`: List all projects
- `get`: Get details of a specific project

### Repositories Tool

Manages Git repositories.

Operations:
- `list`: List repositories in a project
- `get`: Get details of a specific repository
- `listBranches`: List branches in a repository

### Work Items Tool

Manages work items (bugs, tasks, user stories, etc.).

Operations:
- `get`: Get details of a work item
- `create`: Create a new work item

### Pull Requests Tool

Manages pull requests.

Operations:
- `list`: List pull requests in a repository
- `get`: Get details of a specific pull request

### Pipelines Tool

Manages CI/CD pipelines.

Operations:
- `list`: List pipelines in a project
- `get`: Get details of a specific pipeline

## Usage Examples

### List Projects

```json
{
  "operation": "list",
  "listParams": {}
}
```

### Get Project Details

```json
{
  "operation": "get",
  "getParams": {
    "projectId": "my-project"
  }
}
```

### List Repositories in a Project

```json
{
  "operation": "list",
  "listParams": {
    "projectId": "my-project"
  }
}
```

### Get Work Item Details

```json
{
  "operation": "get",
  "getParams": {
    "id": 123,
    "expand": "All"
  }
}
```

### Create a Work Item

```json
{
  "operation": "create",
  "createParams": {
    "projectId": "my-project",
    "type": "Task",
    "title": "Implement new feature",
    "description": "This task involves implementing the new feature XYZ",
    "assignedTo": "user@example.com"
  }
}
```

## Configuration

The server can be configured using environment variables or a configuration file.

### Environment Variables

- `ADO_ORGANIZATION`: Azure DevOps organization name (required)
- `ADO_PROJECT`: Default project name (optional)
- `ADO_PAT`: Personal Access Token for authentication (required)
- `ADO_API_URL`: Base URL for the API (optional, defaults to https://dev.azure.com)
- `ADO_API_VERSION`: API version (optional, defaults to 7.0)
- `ADO_API_MAX_RETRIES`: Maximum number of retries for API calls (optional, defaults to 3)
- `ADO_API_DELAY_MS`: Delay between retries in milliseconds (optional, defaults to 1000)
- `ADO_API_BACKOFF_FACTOR`: Backoff factor for retries (optional, defaults to 2)

### Configuration File

Alternatively, you can create a `config/azuredevops.json` file with the following structure:

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

## Development

### Building the Server

```bash
npm run build
```

### Running the Server

```bash
node build/index.js
```

### Docker

```bash
docker build -t azure-devops-mcp:local .
docker run -i --rm -e ADO_ORGANIZATION=your-org -e ADO_PAT=your-pat azure-devops-mcp:local
```
