import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HoneybadgerApi } from '../api/honeybadger.js';

// Template for listing all projects
export const projectsListTemplate = new ResourceTemplate(
  'honeybadger://projects',
  { list: undefined }
);

// Template for a specific project
export const projectTemplate = new ResourceTemplate(
  'honeybadger://projects/{projectId}',
  { list: undefined }
);

// Template for listing faults in a project
export const projectFaultsTemplate = new ResourceTemplate(
  'honeybadger://projects/{projectId}/faults',
  { list: undefined }
);

// Template for a specific fault
export const faultTemplate = new ResourceTemplate(
  'honeybadger://projects/{projectId}/faults/{faultId}',
  { list: undefined }
);

// Template for notices in a fault
export const noticesTemplate = new ResourceTemplate(
  'honeybadger://projects/{projectId}/faults/{faultId}/notices',
  { list: undefined }
);

export async function handleProjectsResource(
  uri: URL,
  _params: any,
  api: HoneybadgerApi
) {
  try {
    const projects = await api.getProjects();
    
    return {
      contents: [{
        uri: uri.href,
        text: formatProjectsList(projects),
        mimeType: 'text/plain'
      }]
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

export async function handleProjectResource(
  uri: URL,
  params: any,
  api: HoneybadgerApi
) {
  try {
    const projectId = Number(params.projectId);
    if (isNaN(projectId)) {
      throw new Error('Invalid project ID');
    }

    const project = await api.getProject(projectId);
    
    return {
      contents: [{
        uri: uri.href,
        text: formatProject(project),
        mimeType: 'text/plain'
      }]
    };
  } catch (error) {
    console.error(`Error fetching project ${params.projectId}:`, error);
    throw error;
  }
}

export async function handleProjectFaultsResource(
  uri: URL,
  params: any,
  api: HoneybadgerApi
) {
  try {
    const projectId = Number(params.projectId);
    if (isNaN(projectId)) {
      throw new Error('Invalid project ID');
    }

    const faults = await api.getFaults(projectId);
    
    return {
      contents: [{
        uri: uri.href,
        text: formatFaultsList(faults),
        mimeType: 'text/plain'
      }]
    };
  } catch (error) {
    console.error(`Error fetching faults for project ${params.projectId}:`, error);
    throw error;
  }
}

export async function handleFaultResource(
  uri: URL,
  params: any,
  api: HoneybadgerApi
) {
  try {
    const projectId = Number(params.projectId);
    const faultId = Number(params.faultId);
    if (isNaN(projectId) || isNaN(faultId)) {
      throw new Error('Invalid project or fault ID');
    }

    const fault = await api.getFault(projectId, faultId);
    
    return {
      contents: [{
        uri: uri.href,
        text: formatFault(fault),
        mimeType: 'text/plain'
      }]
    };
  } catch (error) {
    console.error(`Error fetching fault ${params.faultId} for project ${params.projectId}:`, error);
    throw error;
  }
}

export async function handleNoticesResource(
  uri: URL,
  params: any,
  api: HoneybadgerApi
) {
  try {
    const projectId = Number(params.projectId);
    const faultId = Number(params.faultId);
    if (isNaN(projectId) || isNaN(faultId)) {
      throw new Error('Invalid project or fault ID');
    }

    const notices = await api.getNotices(projectId, faultId);
    
    return {
      contents: [{
        uri: uri.href,
        text: formatNoticesList(notices),
        mimeType: 'text/plain'
      }]
    };
  } catch (error) {
    console.error(`Error fetching notices for fault ${params.faultId} in project ${params.projectId}:`, error);
    throw error;
  }
}

// Helper functions to format data
function formatProjectsList(projects: any[]) {
  return `# Honeybadger Projects\n\n${projects.map(project => 
    `## ${project.name} (ID: ${project.id})\n` +
    `- Faults: ${project.fault_count} (${project.unresolved_fault_count} unresolved)\n` +
    `- Environments: ${project.environments.join(', ')}\n` +
    `- Last error: ${project.last_notice_at || 'Never'}\n`
  ).join('\n')}`;
}

function formatProject(project: any) {
  return `# Project: ${project.name} (ID: ${project.id})\n\n` +
    `- Active: ${project.active ? 'Yes' : 'No'}\n` +
    `- Created at: ${project.created_at}\n` +
    `- Environments: ${project.environments.join(', ')}\n` +
    `- Faults: ${project.fault_count} (${project.unresolved_fault_count} unresolved)\n` +
    `- First notice at: ${project.earliest_notice_at || 'Never'}\n` +
    `- Last notice at: ${project.last_notice_at || 'Never'}\n` +
    (project.owner ? `- Owner: ${project.owner.name} (${project.owner.email})\n` : '') +
    (project.teams && project.teams.length ? `- Teams: ${project.teams.map((t: any) => t.name).join(', ')}\n` : '');
}

function formatFaultsList(faults: any[]) {
  return `# Faults\n\n${faults.map(fault => 
    `## ${fault.klass}: ${fault.message} (ID: ${fault.id})\n` +
    `- Environment: ${fault.environment}\n` +
    `- Status: ${fault.resolved ? 'Resolved' : 'Unresolved'}${fault.ignored ? ', Ignored' : ''}\n` +
    `- Occurrences: ${fault.notices_count}\n` +
    `- First seen: ${fault.created_at}\n` +
    `- Last seen: ${fault.last_notice_at}\n` +
    (fault.assignee ? `- Assigned to: ${fault.assignee.name}\n` : '')
  ).join('\n\n')}`;
}

function formatFault(fault: any) {
  return `# Fault: ${fault.klass}: ${fault.message} (ID: ${fault.id})\n\n` +
    `- Project ID: ${fault.project_id}\n` +
    `- Environment: ${fault.environment}\n` +
    `- Component: ${fault.component || 'N/A'}\n` +
    `- Status: ${fault.resolved ? 'Resolved' : 'Unresolved'}${fault.ignored ? ', Ignored' : ''}\n` +
    `- Occurrences: ${fault.notices_count}\n` +
    `- First seen: ${fault.created_at}\n` +
    `- Last seen: ${fault.last_notice_at}\n` +
    (fault.assignee ? `- Assigned to: ${fault.assignee.name} (${fault.assignee.email})\n` : '') +
    (fault.tags && fault.tags.length ? `- Tags: ${fault.tags.join(', ')}\n` : '') +
    `- URL: ${fault.url}\n`;
}

function formatNoticesList(notices: any[]) {
  return `# Error Notices\n\n${notices.map(notice => 
    `## Notice: ${notice.id}\n` +
    `- Created at: ${notice.created_at}\n` +
    `- Message: ${notice.message}\n` +
    (notice.request ? `- URL: ${notice.request.url || 'N/A'}\n` : '') +
    (notice.backtrace ? formatBacktrace(notice.backtrace) : '')
  ).join('\n\n')}`;
}

function formatBacktrace(backtrace: any[]) {
  if (!backtrace || backtrace.length === 0) {
    return '- No backtrace available\n';
  }
  
  return `- Backtrace:\n${backtrace.map(frame => 
    `  - ${frame.file}:${frame.number} in ${frame.method}`
  ).join('\n')}\n`;
}