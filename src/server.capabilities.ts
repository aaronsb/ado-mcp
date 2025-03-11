/**
 * Azure DevOps MCP server capabilities
 * Defines the tools and resources available in the server
 */
export const serverCapabilities = {
  tools: {
    // Project tools
    list_projects: true,
    get_project: true,
    
    // Work item tools
    list_work_items: true,
    get_work_item: true,
    create_work_item: true,
    update_work_item: true,
    
    // Repository tools
    list_repositories: true,
    get_repository: true,
    
    // Pull request tools
    list_pull_requests: true,
    get_pull_request: true,
    create_pull_request: true,
    
    // Branch tools
    list_branches: true,
    create_branch: true,
    
    // Pipeline tools
    list_pipelines: true,
    get_pipeline: true,
    run_pipeline: true,
  },
};

/**
 * Get server capabilities
 * @returns Server capabilities
 */
export function getServerCapabilities() {
  return {
    capabilities: serverCapabilities,
  };
}
