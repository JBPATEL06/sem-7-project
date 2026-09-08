import { JsonStore } from './server/utils/JsonStore';
import { RuleEngine } from './server/utils/RuleEngine';

// Mock localStorage and fetch for ApiClient test
(global as any).localStorage = {
  getItem: (key: string) => key === 'ai_manager_token' ? 'mock_jwt_token' : null
};
(global as any).fetch = async (url: string, options: any) => {
  return {
    ok: true,
    json: async () => ({ success: true, url, headers: options.headers })
  };
};

import { ApiClient } from './src/api/client';

async function runTests() {
  console.log('--- Testing JsonStore ---');
  const store = new JsonStore<{id: string, name: string}>('test_store.json');
  
  // Create
  const created = await store.create({ id: '1', name: 'Test Item' });
  console.log('Create:', created);
  
  // Read
  const item = await store.getById('1');
  console.log('Read by ID:', item);
  
  // Update
  const updated = await store.update('1', { name: 'Updated Item' });
  console.log('Update:', updated);
  
  // Delete
  const deleted = await store.delete('1');
  console.log('Delete success:', deleted);
  
  // Read again
  const afterDelete = await store.getById('1');
  console.log('Read after delete:', afterDelete);


  console.log('\n--- Testing RuleEngine ---');
  const engine = new RuleEngine();
  engine.registerRule({
    id: 'mock_rule',
    evaluate: (context) => {
      if (context.tables.length === 0) {
        return [{ ruleId: 'NO_TABLES', severity: 'Warning', message: 'No tables found' }];
      }
      return [];
    }
  });

  const result1 = engine.evaluateAll({ tables: [], schemaDetails: {} });
  console.log('RuleEngine result (empty tables):', result1);

  const result2 = engine.evaluateAll({ tables: ['users'], schemaDetails: {} });
  console.log('RuleEngine result (with tables):', result2);


  console.log('\n--- Testing ApiClient (Mocked) ---');
  try {
    const getResult = await ApiClient.get('http://api.example.com/data');
    console.log('ApiClient.get result:', getResult);
  } catch (err) {
    console.error('ApiClient test error:', err);
  }
}

runTests().catch(console.error);
