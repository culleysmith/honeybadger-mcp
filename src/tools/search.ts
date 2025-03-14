import { z } from 'zod';
import { HoneybadgerApi } from '../api/honeybadger.js';

export const searchFaultsSchema = z.object({
  projectNameOrId: z.string().describe('The name or ID of the project to search'),
  query: z.string().optional().describe('Search query (e.g. "is:unresolved environment:production")'),
  environment: z.string().optional().describe('Filter by environment (e.g. "production", "development")'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results to return (max 100)'),
});

export async function searchFaults(
  params: z.infer<typeof searchFaultsSchema>,
  api: HoneybadgerApi
) {
  try {
    // Find project by name or ID
    const project = await api.findProject(params.projectNameOrId);
    
    if (!project) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Project "${params.projectNameOrId}" not found. Please check the project name or ID and try again.`
          }
        ]
      };
    }
    
    // Build search query
    const searchParams: Record<string, string> = {};
    
    if (params.query) {
      searchParams.q = params.query;
    }
    
    if (params.environment) {
      // Add environment to query if not already included
      if (!params.query || !params.query.includes('environment:')) {
        searchParams.q = (searchParams.q || '') + ` environment:${params.environment}`.trim();
      }
    }
    
    if (params.limit) {
      searchParams.limit = params.limit.toString();
    }
    
    // Fetch faults
    const faults = await api.getFaults(project.id, searchParams);
    
    // Format results
    const formattedResults = formatSearchResults(faults, project);
    
    return {
      content: [
        {
          type: 'text',
          text: formattedResults
        }
      ]
    };
  } catch (error) {
    console.error('Error searching faults:', error);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error searching faults: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

function formatSearchResults(faults: any[], project: any) {
  if (faults.length === 0) {
    return `No faults found for project "${project.name}" (ID: ${project.id}) with the given criteria.`;
  }
  
  return `# Search Results: Found ${faults.length} faults in "${project.name}" (ID: ${project.id})\n\n` +
    faults.map(fault => {
      const status = fault.resolved ? 'Resolved' : 'Unresolved';
      const ignored = fault.ignored ? ' (Ignored)' : '';
      
      return `## [${status}${ignored}] ${fault.klass}: ${fault.message}\n` +
        `- ID: ${fault.id}\n` +
        `- Environment: ${fault.environment || 'Not specified'}\n` +
        `- Occurrences: ${fault.notices_count}\n` +
        `- First seen: ${fault.created_at}\n` +
        `- Last seen: ${fault.last_notice_at}\n` +
        `- URL: ${fault.url}\n`;
    }).join('\n\n');
}

// Tool for getting a fault's backtrace
export const getBacktraceSchema = z.object({
  projectNameOrId: z.string().describe('The name or ID of the project'),
  faultId: z.number().int().positive().describe('The ID of the fault'),
  limit: z.number().int().min(1).max(10).optional().describe('Maximum number of notices to include (max 10)')
});

export async function getBacktrace(
  params: z.infer<typeof getBacktraceSchema>,
  api: HoneybadgerApi
) {
  try {
    // Find project by name or ID
    const project = await api.findProject(params.projectNameOrId);
    
    if (!project) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Project "${params.projectNameOrId}" not found. Please check the project name or ID and try again.`
          }
        ]
      };
    }
    
    // Get the fault
    const fault = await api.getFault(project.id, params.faultId);
    
    // Get the most recent notices for this fault
    const noticeLimit = params.limit || 1;
    const notices = await api.getNotices(project.id, params.faultId, {
      limit: noticeLimit.toString()
    });
    
    if (notices.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No notices found for fault ID ${params.faultId} in project "${project.name}" (ID: ${project.id}).`
          }
        ]
      };
    }
    
    // Format the backtraces
    const formattedBacktraces = formatBacktraces(fault, notices, project);
    
    return {
      content: [
        {
          type: 'text',
          text: formattedBacktraces
        }
      ]
    };
  } catch (error) {
    console.error('Error getting backtrace:', error);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error getting backtrace: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}

function formatBacktraces(fault: any, notices: any[], project?: any) {
  let result = `# Backtrace for ${fault.klass}: ${fault.message}\n`;
  result += `- Fault ID: ${fault.id}\n`;
  result += `- Project: ${project ? `${project.name} (ID: ${project.id})` : `ID: ${fault.project_id}`}\n`;
  result += `- Environment: ${fault.environment || 'Not specified'}\n`;
  result += `- Status: ${fault.resolved ? 'Resolved' : 'Unresolved'}${fault.ignored ? ', Ignored' : ''}\n\n`;
  
  notices.forEach((notice, index) => {
    result += `## Notice ${index + 1}: ${notice.id}\n`;
    result += `- Created at: ${notice.created_at}\n`;
    
    if (notice.request && notice.request.url) {
      result += `- URL: ${notice.request.url}\n`;
    }
    
    if (notice.request && notice.request.component && notice.request.action) {
      result += `- Component/Action: ${notice.request.component}#${notice.request.action}\n`;
    }
    
    result += '\n### Backtrace:\n';
    
    if (notice.backtrace && notice.backtrace.length > 0) {
      notice.backtrace.forEach((frame: any, frameIndex: number) => {
        result += `${frameIndex + 1}. ${frame.file}:${frame.number} in \`${frame.method}\`\n`;
      });
    } else {
      result += 'No backtrace available for this notice.\n';
    }
    
    result += '\n';
  });
  
  return result;
}

// Removed resolving fault functionality to make the server read-only