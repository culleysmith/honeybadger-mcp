import { HoneybadgerApi } from '../api/honeybadger.js';

export const PROMPT_DEFINITIONS = {
  analyze_error: {
    name: 'analyze_error',
    description: 'Analyze an error and suggest fixes',
    arguments: [
      {
        name: 'projectNameOrId',
        description: 'The name or ID of the project containing the error',
        required: true
      },
      {
        name: 'faultId',
        description: 'The ID of the fault/error to analyze',
        required: true
      }
    ]
  },
  summarize_fault: {
    name: 'summarize_fault',
    description: 'Provide a concise summary of an error',
    arguments: [
      {
        name: 'projectNameOrId',
        description: 'The name or ID of the project containing the error',
        required: true
      },
      {
        name: 'faultId',
        description: 'The ID of the fault/error to summarize',
        required: true
      }
    ]
  }
};

export async function analyzeErrorPrompt(
  params: { projectNameOrId: string, faultId: string },
  api: HoneybadgerApi
) {
  try {
    // Find project by name or ID
    const project = await api.findProject(params.projectNameOrId);
    
    if (!project) {
      throw new Error(`Project "${params.projectNameOrId}" not found. Please check the name or ID.`);
    }
    
    const faultId = Number(params.faultId);
    
    if (isNaN(faultId)) {
      throw new Error('Invalid fault ID');
    }
    
    // Get the fault details
    const fault = await api.getFault(project.id, faultId);
    
    // Get the latest notice with backtrace
    const notices = await api.getNotices(project.id, faultId, { limit: '1' });
    const notice = notices[0];
    
    // Format the data for the prompt
    const promptData = formatErrorAnalysisPrompt(fault, notice, project);
    
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptData
          }
        }
      ]
    };
  } catch (error) {
    console.error('Error generating analyze error prompt:', error);
    throw error;
  }
}

export async function summarizeFaultPrompt(
  params: { projectNameOrId: string, faultId: string },
  api: HoneybadgerApi
) {
  try {
    // Find project by name or ID
    const project = await api.findProject(params.projectNameOrId);
    
    if (!project) {
      throw new Error(`Project "${params.projectNameOrId}" not found. Please check the name or ID.`);
    }
    
    const faultId = Number(params.faultId);
    
    if (isNaN(faultId)) {
      throw new Error('Invalid fault ID');
    }
    
    // Get the fault details
    const fault = await api.getFault(project.id, faultId);
    
    // Format the data for the prompt
    const promptData = formatFaultSummaryPrompt(fault, project);
    
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptData
          }
        }
      ]
    };
  } catch (error) {
    console.error('Error generating summarize fault prompt:', error);
    throw error;
  }
}

function formatErrorAnalysisPrompt(fault: any, notice: any, project?: any) {
  let prompt = `Please analyze the following error and suggest potential fixes:

PROJECT: ${project ? project.name : `ID: ${fault.project_id}`}
ERROR TYPE: ${fault.klass}
ERROR MESSAGE: ${fault.message}
ENVIRONMENT: ${fault.environment || 'Not specified'}
COMPONENT: ${fault.component || 'Not specified'}
OCCURRENCES: ${fault.notices_count}
FIRST SEEN: ${fault.created_at}
LAST SEEN: ${fault.last_notice_at}

`;

  if (notice) {
    if (notice.request && notice.request.url) {
      prompt += `REQUEST URL: ${notice.request.url}\n`;
    }
    
    if (notice.request && notice.request.params) {
      prompt += `REQUEST PARAMETERS: ${JSON.stringify(notice.request.params, null, 2)}\n`;
    }
    
    if (notice.backtrace && notice.backtrace.length > 0) {
      prompt += '\nBACKTRACE:\n';
      notice.backtrace.forEach((frame: any, index: number) => {
        prompt += `${index + 1}. ${frame.file}:${frame.number} in \`${frame.method}\`\n`;
      });
    }
  }
  
  prompt += `
Based on the error type, message, and backtrace above:
1. What is likely causing this error?
2. What are potential solutions to fix it?
3. What additional information might be needed to better diagnose the issue?

Please provide a detailed analysis with specific code suggestions if possible.`;

  return prompt;
}

function formatFaultSummaryPrompt(fault: any, project?: any) {
  const status = fault.resolved ? 'Resolved' : 'Unresolved';
  const ignored = fault.ignored ? ', Ignored' : '';
  
  return `Please provide a concise summary of the following error:

PROJECT: ${project ? project.name : `ID: ${fault.project_id}`}
ERROR TYPE: ${fault.klass}
ERROR MESSAGE: ${fault.message}
STATUS: ${status}${ignored}
ENVIRONMENT: ${fault.environment || 'Not specified'}
COMPONENT: ${fault.component || 'Not specified'}
OCCURRENCES: ${fault.notices_count}
FIRST SEEN: ${fault.created_at}
LAST SEEN: ${fault.last_notice_at}

Please summarize:
1. What this error means in simple terms
2. Potential causes
3. Common ways to address this type of error

Keep your summary concise and actionable.`;
}