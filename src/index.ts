import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { HoneybadgerApi } from './api/honeybadger.js';
import { 
  projectsListTemplate, 
  projectTemplate, 
  projectFaultsTemplate, 
  faultTemplate,
  noticesTemplate,
  handleProjectsResource,
  handleProjectResource,
  handleProjectFaultsResource,
  handleFaultResource,
  handleNoticesResource
} from './resources/projects.js';
import {
  searchFaults,
  getBacktrace
} from './tools/search.js';
import {
  findProject,
  findProjectSchema
} from './tools/find_project.js';
import {
  PROMPT_DEFINITIONS,
  analyzeErrorPrompt,
  summarizeFaultPrompt
} from './prompts/analyze.js';

// Load environment variables
config();

// Check for API token
const apiToken = process.env.HONEYBADGER_API_TOKEN || '';
if (!apiToken) {
  console.error('Error: HONEYBADGER_API_TOKEN environment variable is required.');
  process.exit(1);
}

// Get default project ID (optional)
const defaultProjectId = process.env.HONEYBADGER_PROJECT_ID;

async function startServer() {
  try {
    console.error('Starting Honeybadger MCP Server...');
    
    // Initialize Honeybadger API client
    const api = new HoneybadgerApi({ apiToken });
    
    // Create the MCP server
    const server = new McpServer({
      name: 'Honeybadger MCP',
      version: '0.1.0'
    });
    
    // Register resources
    server.resource(
      'projects',
      'honeybadger://projects',
      async (uri) => handleProjectsResource(uri, {}, api)
    );
    
    // Add default project resources if a default project ID is set
    if (defaultProjectId) {
      const projectId = Number(defaultProjectId);
      if (!isNaN(projectId)) {
        // Default project info resource
        server.resource(
          'default-project',
          'honeybadger://default-project',
          async (uri) => {
            try {
              const project = await api.getProject(projectId);
              
              return {
                contents: [{
                  uri: uri.href,
                  text: `# Default Project: ${project.name} (ID: ${project.id})\n\n` +
                    `- Active: ${project.active ? 'Yes' : 'No'}\n` +
                    `- Created at: ${project.created_at}\n` +
                    `- Environments: ${project.environments.join(', ')}\n` +
                    `- Faults: ${project.fault_count} (${project.unresolved_fault_count} unresolved)\n` +
                    `- First notice at: ${project.earliest_notice_at || 'Never'}\n` +
                    `- Last notice at: ${project.last_notice_at || 'Never'}\n` +
                    `\nYou can use this project ID (${project.id}) for searching faults and accessing error details without needing to specify it every time.`,
                  mimeType: 'text/plain'
                }]
              };
            } catch (error) {
              console.error('Error fetching default project:', error);
              throw error;
            }
          }
        );
        
        // Default project faults resource
        server.resource(
          'default-project-faults',
          'honeybadger://default-project/faults',
          async (uri) => {
            try {
              const faults = await api.getFaults(projectId);
              
              return {
                contents: [{
                  uri: uri.href,
                  text: `# Faults in Default Project (ID: ${projectId})\n\n` + 
                    faults.map(fault => 
                      `## ${fault.klass}: ${fault.message} (ID: ${fault.id})\n` +
                      `- Environment: ${fault.environment || 'Not specified'}\n` +
                      `- Status: ${fault.resolved ? 'Resolved' : 'Unresolved'}${fault.ignored ? ', Ignored' : ''}\n` +
                      `- Occurrences: ${fault.notices_count}\n` +
                      `- First seen: ${fault.created_at}\n` +
                      `- Last seen: ${fault.last_notice_at}\n`
                    ).join('\n\n'),
                  mimeType: 'text/plain'
                }]
              };
            } catch (error) {
              console.error('Error fetching faults for default project:', error);
              throw error;
            }
          }
        );
      }
    }
    
    server.resource(
      'project',
      'honeybadger://projects/{projectId}',
      async (uri, params: any) => handleProjectResource(uri, params, api)
    );
    
    server.resource(
      'project-faults',
      'honeybadger://projects/{projectId}/faults',
      async (uri, params: any) => handleProjectFaultsResource(uri, params, api)
    );
    
    server.resource(
      'fault',
      'honeybadger://projects/{projectId}/faults/{faultId}',
      async (uri, params: any) => handleFaultResource(uri, params, api)
    );
    
    server.resource(
      'notices',
      'honeybadger://projects/{projectId}/faults/{faultId}/notices',
      async (uri, params: any) => handleNoticesResource(uri, params, api)
    );
    
    // Register tools
    server.tool(
      'find_project',
      {
        nameOrId: { type: 'string', description: 'The name or ID of the project to find' }
      },
      // @ts-ignore
      async (params) => findProject(params, api)
    );
    
    server.tool(
      'search_faults',
      {
        projectNameOrId: { type: 'string', description: 'The name or ID of the project to search' },
        query: { type: 'string', description: 'Search query (e.g. "is:unresolved environment:production")', required: false },
        environment: { type: 'string', description: 'Filter by environment (e.g. "production", "development")', required: false },
        limit: { type: 'number', description: 'Maximum number of results to return (max 100)', required: false }
      },
      // @ts-ignore
      async (params) => searchFaults(params, api)
    );
    
    server.tool(
      'get_backtrace',
      {
        projectNameOrId: { type: 'string', description: 'The name or ID of the project' },
        faultId: { type: 'number', description: 'The ID of the fault' },
        limit: { type: 'number', description: 'Maximum number of notices to include (max 10)', required: false }
      },
      // @ts-ignore
      async (params) => getBacktrace(params, api)
    );
    
    // Removed resolve_fault tool to ensure the server is read-only
    
    // Register prompts
    server.prompt(
      PROMPT_DEFINITIONS.analyze_error.name,
      {
        projectNameOrId: { type: 'string' },
        faultId: { type: 'string' }
      },
      // @ts-ignore
      async (params) => analyzeErrorPrompt(params, api)
    );
    
    server.prompt(
      PROMPT_DEFINITIONS.summarize_fault.name,
      {
        projectNameOrId: { type: 'string' },
        faultId: { type: 'string' }
      },
      // @ts-ignore
      async (params) => summarizeFaultPrompt(params, api)
    );
    
    // Create a transport for the server
    const transport = new StdioServerTransport();
    
    // Start the server
    await server.connect(transport);
    console.error('Honeybadger MCP Server is ready!');
  } catch (error) {
    console.error('Failed to start Honeybadger MCP Server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();