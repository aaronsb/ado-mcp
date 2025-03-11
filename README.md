# Azure DevOps MCP Server

A Model Context Protocol server for Azure DevOps integration, enabling AI assistants to interact with Azure DevOps resources.

## Features

- Interact with Azure DevOps Projects, Work Items, Repositories, Pull Requests, Branches, and Pipelines
- Perform CRUD operations on Azure DevOps resources
- Search and filter resources with flexible criteria
- Seamless integration with AI assistants that support the Model Context Protocol

## Architecture

This project follows a modular architecture with clear separation of concerns:

```
src/
├── entities/       # Entity models for Azure DevOps resources
├── api/            # API client and operations
└── tools/          # MCP tool implementations
```

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- Docker (for containerized deployment)
- Azure DevOps Personal Access Token (PAT)

### Installation

#### Using Docker

```bash
# Clone the repository and build the Docker image locally
git clone https://github.com/aaronsb/ado-mcp.git
cd ado-mcp
./scripts/build-local.sh
```

#### Local Development

1. Clone the repository:
```bash
git clone https://github.com/aaronsb/ado-mcp.git
cd ado-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Azure DevOps credentials:
```bash
cp config/azuredevops.example.json config/azuredevops.json
# Edit config/azuredevops.json with your credentials
```

4. Build the project:
```bash
npm run build
```

5. Run the server:
```bash
node build/index.js
```

## Configuration

The server can be configured using environment variables or a configuration file:

### Environment Variables

- `ADO_ORGANIZATION`: Your Azure DevOps organization name
- `ADO_PROJECT`: Your Azure DevOps project name (optional)
- `ADO_PAT`: Your Personal Access Token

### Configuration File

Create a `config/azuredevops.json` file with the following structure:

```json
{
  "organization": "your-organization",
  "project": "your-project",
  "credentials": {
    "pat": "your-personal-access-token"
  }
}
```

## API Reference

This project integrates with the [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/).

## Tools

The server provides the following MCP tools:

- `list_projects`: List Azure DevOps projects
- `get_project`: Get details of a specific project
- `list_work_items`: List work items with filtering
- `get_work_item`: Get details of a specific work item
- `create_work_item`: Create a new work item
- `update_work_item`: Update an existing work item
- `list_repositories`: List Git repositories
- `get_repository`: Get details of a specific repository
- `list_pull_requests`: List pull requests
- `get_pull_request`: Get details of a specific pull request
- `create_pull_request`: Create a new pull request
- `list_branches`: List branches in a repository
- `create_branch`: Create a new branch
- `list_pipelines`: List pipelines
- `get_pipeline`: Get details of a specific pipeline
- `run_pipeline`: Trigger a pipeline run

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
