# Honeybadger MCP Server

An MCP (Model Context Protocol) server that provides access to Honeybadger error tracking data for LLMs like Claude.

## Features

- **Resources**: Access Honeybadger projects, faults (errors), and notices (error instances)
- **Tools**: Search for errors, get backtraces, and resolve faults
- **Prompts**: Generate prompts for error analysis and summaries

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your Honeybadger API token:

```
HONEYBADGER_API_TOKEN=your_api_token_here
```

## Usage

### Building and Running

Build the TypeScript code:

```bash
npm run build
```

Run the server:

```bash
npm start
```

> **Note**: Due to some TypeScript type issues with the MCP SDK, we recommend using `tsx` directly for now:
>
> ```bash
> npx tsx src/index.ts
> ```

### Development Mode

For development with auto-reloading:

```bash
npm run dev
```

### Using with Claude Desktop

To configure this server in Claude Desktop:

1. Create a `claude_desktop_config.json` file in your home directory:

```json
{
  "honeybadger": {
    "command": "npx",
    "args": ["tsx", "/path/to/honeybadger-mcp/src/index.ts"],
    "env": {
      "HONEYBADGER_API_TOKEN": "your_api_token_here"
    }
  }
}
```

2. Restart Claude Desktop
3. The server should now appear in the MCP servers list

### Testing with the MCP Inspector

You can test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

This will launch the server and open the MCP Inspector interface in your browser at http://localhost:5173. From there, you can:

1. Test resources by clicking on them in the Resources tab
2. Use tools by filling in the parameters in the Tools tab 
3. Try prompts by providing the required arguments in the Prompts tab

## Available Resources

### Standard Resources
- `honeybadger://projects` - List all projects
- `honeybadger://projects/{projectId}` - Get details for a specific project
- `honeybadger://projects/{projectId}/faults` - List all faults for a project
- `honeybadger://projects/{projectId}/faults/{faultId}` - Get details for a specific fault
- `honeybadger://projects/{projectId}/faults/{faultId}/notices` - Get notices for a specific fault

### Default Project Resources
If you set the `HONEYBADGER_PROJECT_ID` environment variable, the following resources will also be available:

- `honeybadger://default-project` - Details about the default project
- `honeybadger://default-project/faults` - List of faults in the default project

Using the default project makes it easier to work with a single project without having to specify the project ID each time.

## Available Tools

- `find_project` - Find a project by name or ID
- `search_faults` - Search for faults in a project with filtering options
- `get_backtrace` - Get the backtrace for a specific fault

All tools support finding projects by either ID or name, so you can use names like "Thoroughfare" or "Timeline" instead of numeric IDs.

> Note: This MCP server is read-only and does not provide tools to modify data in Honeybadger.

## Available Prompts

- `analyze_error` - Generate a prompt to analyze an error and suggest fixes
- `summarize_fault` - Generate a prompt to summarize a fault in simple terms

## Example Interactions

### Using with Claude

Here are some example queries you can ask Claude when using this MCP server:

- "Show me a list of projects in Honeybadger"
- "Find the project called 'Thoroughfare'"
- "What are the unresolved errors in the Timeline project?"
- "Show me the backtrace for fault 123456 in project 'Thoroughfare'"
- "Help me analyze the error with ID 123456 in the Timeline project"
- "Summarize the error with ID 123456 in Thoroughfare"

You can use either project names or IDs throughout, making it much more natural to interact with your projects.

## License

MIT