import { HoneybadgerApi } from './api/honeybadger.js';

const api = new HoneybadgerApi({ apiToken: 'aFYH4r698Kd22fZWyqBF' });

async function testConnection() {
  try {
    // Test getting project info
    console.log('Testing connection to Honeybadger API...');
    const project = await api.getProject(130943);
    console.log('Successfully connected to Honeybadger API');
    console.log(`Project name: ${project.name}`);
    console.log(`Fault count: ${project.fault_count}`);
    console.log(`Unresolved fault count: ${project.unresolved_fault_count}`);
    
    // Test listing faults
    console.log('\nListing recent faults...');
    const faults = await api.getFaults(130943, { limit: '3' });
    console.log(`Found ${faults.length} faults.`);
    
    if (faults.length > 0) {
      const fault = faults[0];
      console.log(`\nFirst fault details:`);
      console.log(`- ID: ${fault.id}`);
      console.log(`- Type: ${fault.klass}`);
      console.log(`- Message: ${fault.message}`);
      
      // Test getting notices
      console.log('\nGetting notices for the fault...');
      const notices = await api.getNotices(130943, fault.id, { limit: '1' });
      console.log(`Found ${notices.length} notices.`);
      
      if (notices.length > 0) {
        const notice = notices[0];
        console.log(`Notice ID: ${notice.id}`);
        if (notice.backtrace && notice.backtrace.length > 0) {
          console.log(`Backtrace has ${notice.backtrace.length} entries.`);
          console.log(`First backtrace entry: ${notice.backtrace[0].file}:${notice.backtrace[0].number}`);
        } else {
          console.log('No backtrace available.');
        }
      }
    }
  } catch (error) {
    console.error('Error connecting to Honeybadger API:', error);
  }
}

testConnection();