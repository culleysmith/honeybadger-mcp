import { HoneybadgerApi } from './api/honeybadger.js';
import { config } from 'dotenv';

// Load environment variables
config();

const api = new HoneybadgerApi({ apiToken: process.env.HONEYBADGER_API_TOKEN || '' });

async function searchForErrors() {
  try {
    console.log('Fetching all projects...');
    const projectsResponse = await api.getProjects();
    
    // Check if we got a proper response with projects
    console.log('Projects API response:', JSON.stringify(projectsResponse, null, 2).substring(0, 500));
    
    // Try to handle different possible response formats
    let projects = [];
    if (Array.isArray(projectsResponse)) {
      projects = projectsResponse;
    } else if (projectsResponse && typeof projectsResponse === 'object') {
      if (Array.isArray(projectsResponse.results)) {
        projects = projectsResponse.results;
      } else if (projectsResponse.projects && Array.isArray(projectsResponse.projects)) {
        projects = projectsResponse.projects;
      }
    }
    
    console.log(`Found ${projects.length} projects:`);
    
    for (const project of projects) {
      console.log(`\n===== Project: ${project.name} (ID: ${project.id}) =====`);
      console.log(`Faults: ${project.fault_count} (${project.unresolved_fault_count} unresolved)`);
      
      console.log('\nFetching faults...');
      const faults = await api.getFaults(project.id);
      
      // Look for specific errors
      const unhappyErrors = faults.filter(fault => fault.klass.includes('Unhappy'));
      const happyErrors = faults.filter(fault => fault.klass.includes('Happy'));
      
      if (unhappyErrors.length > 0) {
        console.log(`\nFound ${unhappyErrors.length} UnhappyError(s) in project ${project.name}:`);
        for (const error of unhappyErrors) {
          console.log(`- ${error.klass}: "${error.message}"`);
          console.log(`  Occurred at: ${error.created_at}`);
          console.log(`  Last seen at: ${error.last_notice_at}`);
          
          // Get a notice to check for stacktrace
          const notices = await api.getNotices(project.id, error.id, { limit: '1' });
          if (notices.length > 0) {
            const hasStacktrace = notices[0].backtrace && notices[0].backtrace.length > 0;
            console.log(`  Has stacktrace: ${hasStacktrace ? 'Yes' : 'No'}`);
            if (hasStacktrace) {
              console.log(`  First frame: ${notices[0].backtrace[0].file}:${notices[0].backtrace[0].number}`);
            }
          } else {
            console.log('  No notices found');
          }
        }
      }
      
      if (happyErrors.length > 0) {
        console.log(`\nFound ${happyErrors.length} HappyError(s) in project ${project.name}:`);
        for (const error of happyErrors) {
          console.log(`- ${error.klass}: "${error.message}"`);
          console.log(`  Occurred at: ${error.created_at}`);
          console.log(`  Last seen at: ${error.last_notice_at}`);
          
          // Get a notice to check for stacktrace
          const notices = await api.getNotices(project.id, error.id, { limit: '1' });
          if (notices.length > 0) {
            const hasStacktrace = notices[0].backtrace && notices[0].backtrace.length > 0;
            console.log(`  Has stacktrace: ${hasStacktrace ? 'Yes' : 'No'}`);
            if (hasStacktrace) {
              console.log(`  First frame: ${notices[0].backtrace[0].file}:${notices[0].backtrace[0].number}`);
            }
          } else {
            console.log('  No notices found');
          }
        }
      }
      
      if (unhappyErrors.length === 0 && happyErrors.length === 0) {
        console.log('No Happy or Unhappy errors found in this project');
      }
    }
  } catch (error) {
    console.error('Error searching for errors:', error);
  }
}

// Run the search
searchForErrors();