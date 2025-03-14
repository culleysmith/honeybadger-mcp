# Honeybadger MCP Server Notes

## Project Overview
We need to build an MCP (Model Context Protocol) server that allows LLMs like Claude to interact with the Honeybadger error tracking service. This will enable users to ask questions like "What is the stacktrace for this error?" or "Help me fix this error."

## Key Components

### 1. MCP Server Structure
- Build using TypeScript SDK for MCP
- Implement the server with all necessary capabilities (resources, tools, prompts)
- Expose the Honeybadger API via the MCP protocol
- Support authentication against Honeybadger API

### 2. Honeybadger API Integration
- API Base URL: https://app.honeybadger.io/v2/
- Authentication: Basic auth with token
- Key endpoints:
  - `/projects` - List projects
  - `/projects/{id}` - Get project details
  - `/projects/{id}/faults` - List faults/errors
  - `/projects/{id}/faults/{id}` - Get fault details
  - `/projects/{id}/faults/{id}/notices` - Get error instances
  - `/projects/{id}/faults/{id}/affected_users` - Get affected users

### 3. MCP Resources
Possible resources to expose:
- `honeybadger://projects` - List of projects
- `honeybadger://projects/{id}` - Project details
- `honeybadger://projects/{id}/faults` - List of faults for a project
- `honeybadger://projects/{id}/faults/{id}` - Details of a specific fault
- `honeybadger://projects/{id}/faults/{id}/notices` - Error notices for a fault
- `honeybadger://projects/{id}/faults/{id}/backtrace` - Just the backtrace for a fault

### 4. MCP Tools
Possible tools to implement:
- `search_faults` - Search for faults with filters
- `get_fault_details` - Get detailed information about a fault
- `get_backtrace` - Get the backtrace for a specific error
- `resolve_fault` - Mark a fault as resolved
- `get_affected_users` - Get users affected by an error

### 5. MCP Prompts
Potential prompts to define:
- `analyze_error` - Analyze an error and suggest fixes
- `summarize_fault` - Provide a concise summary of an error
- `debug_help` - Generate a debugging plan for an error

## Implementation Plan
1. Set up basic MCP server structure
2. Implement authentication and connection to Honeybadger API
3. Create resources for projects and faults
4. Implement tools for querying and updating data
5. Define helpful prompts for common use cases
6. Add proper error handling and logging
7. Test with MCP Inspector

## Security Considerations
- Store Honeybadger API token securely
- Validate all inputs before sending to the API
- Handle errors gracefully
- Sanitize any sensitive data from logs

## Questions to Resolve
- How will users provide their Honeybadger API token?
- Should we store project/fault data or fetch it on demand?
- How to handle rate limiting from the Honeybadger API?
- What transport mechanism should we use (stdio, SSE)?