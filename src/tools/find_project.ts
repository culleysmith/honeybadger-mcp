import { z } from 'zod';
import { HoneybadgerApi } from '../api/honeybadger.js';

export const findProjectSchema = z.object({
  nameOrId: z.string().describe('The name or ID of the project to find')
});

export async function findProject(
  params: z.infer<typeof findProjectSchema>,
  api: HoneybadgerApi
) {
  try {
    // Try to find the project by name or ID
    const project = await api.findProject(params.nameOrId);
    
    if (!project) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Project "${params.nameOrId}" not found. Please check the project name or ID and try again.`
          }
        ]
      };
    }
    
    // Format the result
    return {
      content: [
        {
          type: 'text',
          text: `# Project: ${project.name} (ID: ${project.id})

- Active: ${project.active ? 'Yes' : 'No'}
- Created at: ${project.created_at}
- Environments: ${project.environments.join(', ')}
- Faults: ${project.fault_count} (${project.unresolved_fault_count} unresolved)
- First notice at: ${project.earliest_notice_at || 'Never'}
- Last notice at: ${project.last_notice_at || 'Never'}
${project.owner ? `- Owner: ${project.owner.name} (${project.owner.email})\n` : ''}
${project.teams && project.teams.length ? `- Teams: ${project.teams.map((t: any) => t.name).join(', ')}\n` : ''}

You can use this project ID (${project.id}) for searching faults and accessing error details.`
        }
      ]
    };
  } catch (error) {
    console.error('Error finding project:', error);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error finding project: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}