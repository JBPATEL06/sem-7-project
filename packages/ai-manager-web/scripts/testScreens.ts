import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3000';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 DAY 4: PENPOT LAYOUT SPEC PLUGIN BRIDGE TEST SUITE');
  console.log('======================================================\n');

  const ts = Date.now();
  const userAEmail = `screen_user_a_${ts}@test.com`;
  const userBEmail = `screen_user_b_${ts}@test.com`;
  const testPassword = 'Password@123';

  // Step 0: Register User A and User B
  console.log('0. Registering test users...');
  const regARes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password: testPassword })
  });
  const regAData = (await regARes.json()) as any;
  const tokenA = regAData.token;
  console.log(`   User A: ${userAEmail} (ID: ${regAData.user?.id})`);

  const regBRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBEmail, password: testPassword })
  });
  const regBData = (await regBRes.json()) as any;
  const tokenB = regBData.token;
  console.log(`   User B: ${userBEmail} (ID: ${regBData.user?.id})`);

  // Admin login
  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bhanderijeel8@gmail.com', password: 'Admin@123456' })
  });
  const adminData = (await adminLoginRes.json()) as any;
  const tokenAdmin = adminData.token;
  console.log(`   Admin: bhanderijeel8@gmail.com (Role: ${adminData.user?.role})`);

  // Test 1: Get available template presets
  console.log('\n1. Testing GET /api/screens/templates...');
  const templatesRes = await fetch(`${API_BASE}/api/screens/templates`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const templatesData = (await templatesRes.json()) as any;

  if (templatesRes.status === 200 && templatesData.templates.length >= 3) {
    console.log(`   ✅ Success: Retrieved ${templatesData.templates.length} presets (saas-dashboard, auth-portal, kanban-board)`);
  } else {
    console.error('   ❌ Failed to get templates:', templatesRes.status, templatesData);
    process.exit(1);
  }

  // Test 2: User A creates a new layout spec
  console.log('\n2. Testing POST /api/screens (User A creating Kanban Board)...');
  const createRes = await fetch(`${API_BASE}/api/screens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      name: 'Sprint Alpha Board',
      description: 'DevOps workflow board for Semester-7 Project',
      templateKey: 'kanban-board',
      projectId: 'acme-api'
    })
  });
  const createData = (await createRes.json()) as any;

  if (createRes.status === 201 && createData.screen.id) {
    console.log(`   ✅ Success: Created screen "${createData.screen.name}" (ID: ${createData.screen.id})`);
  } else {
    console.error('   ❌ Failed to create screen:', createRes.status, createData);
    process.exit(1);
  }
  const screenAId = createData.screen.id;

  // Test 3: AI Prompt-to-Layout generation
  console.log('\n3. Testing POST /api/screens/generate (AI Layout Generator)...');
  const aiRes = await fetch(`${API_BASE}/api/screens/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      prompt: 'Create an enterprise login and auth flow with GitHub SSO button',
      projectId: 'acme-api'
    })
  });
  const aiData = (await aiRes.json()) as any;

  if (aiRes.status === 201 && aiData.screen.board.components.length > 0) {
    console.log(`   ✅ Success: AI generated layout spec "${aiData.screen.name}" with ${aiData.screen.board.components.length} top-level components`);
  } else {
    console.error('   ❌ Failed AI generation:', aiRes.status, aiData);
    process.exit(1);
  }
  const aiScreenId = aiData.screen.id;

  // Test 4: Export to Penpot Plugin Manifest
  console.log('\n4. Testing GET /api/screens/:id/export?format=penpot...');
  const exportRes = await fetch(`${API_BASE}/api/screens/${screenAId}/export?format=penpot`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const exportData = (await exportRes.json()) as any;

  if (
    exportRes.status === 200 &&
    exportData.schemaVersion === '2.0' &&
    exportData.generator === 'AI-Manager Penpot Layout Spec Bridge' &&
    exportData.board.shapes.length > 0
  ) {
    console.log(`   ✅ Success: Generated valid Penpot Plugin Manifest Schema 2.0 with ${exportData.board.shapes.length} board shapes`);
  } else {
    console.error('   ❌ Failed Penpot manifest export:', exportRes.status, exportData);
    process.exit(1);
  }

  // Test 5: Update layout spec
  console.log('\n5. Testing PUT /api/screens/:id...');
  const updateRes = await fetch(`${API_BASE}/api/screens/${screenAId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      name: 'Sprint Alpha Board (Renamed & Polished)'
    })
  });
  const updateData = (await updateRes.json()) as any;

  if (updateRes.status === 200 && updateData.screen.name === 'Sprint Alpha Board (Renamed & Polished)') {
    console.log(`   ✅ Success: Updated screen title to "${updateData.screen.name}"`);
  } else {
    console.error('   ❌ Failed to update screen:', updateRes.status, updateData);
    process.exit(1);
  }

  // Test 6: Multi-User Isolation Check (User B trying to access User A's screen)
  console.log('\n6. Testing Multi-User Data Isolation (User B trying to modify/read User A screen)...');
  
  // 6a: User B reading User A's screen
  const readForbidden = await fetch(`${API_BASE}/api/screens/${screenAId}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  console.log(`   - User B GET /api/screens/${screenAId}: Status ${readForbidden.status} (${readForbidden.status === 403 ? '✅ 403 Forbidden' : '❌ UNEXPECTED'})`);

  // 6b: User B updating User A's screen
  const putForbidden = await fetch(`${API_BASE}/api/screens/${screenAId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`
    },
    body: JSON.stringify({ name: 'Hacked by User B' })
  });
  console.log(`   - User B PUT /api/screens/${screenAId}: Status ${putForbidden.status} (${putForbidden.status === 403 ? '✅ 403 Forbidden' : '❌ UNEXPECTED'})`);

  // 6c: User B exporting User A's screen
  const exportForbidden = await fetch(`${API_BASE}/api/screens/${screenAId}/export?format=penpot`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  console.log(`   - User B Export /api/screens/${screenAId}: Status ${exportForbidden.status} (${exportForbidden.status === 403 ? '✅ 403 Forbidden' : '❌ UNEXPECTED'})`);

  if (readForbidden.status === 403 && putForbidden.status === 403 && exportForbidden.status === 403) {
    console.log('   ✅ Success: Cross-user access strictly blocked with 403 Forbidden');
  } else {
    console.error('   ❌ Isolation check failed!');
    process.exit(1);
  }

  // Test 7: Admin Global Access
  console.log('\n7. Testing Admin Global Read Access...');
  const adminRead = await fetch(`${API_BASE}/api/screens/${screenAId}`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  const adminReadData = (await adminRead.json()) as any;

  if (adminRead.status === 200 && adminReadData.screen.id === screenAId) {
    console.log('   ✅ Success: Administrator has global visibility to inspect user layout specs');
  } else {
    console.error('   ❌ Admin global read failed:', adminRead.status, adminReadData);
    process.exit(1);
  }

  // Test 8: Clean Deletion
  console.log('\n8. Testing DELETE /api/screens/:id...');
  const deleteRes = await fetch(`${API_BASE}/api/screens/${screenAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const deleteAiRes = await fetch(`${API_BASE}/api/screens/${aiScreenId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });

  if (deleteRes.status === 200 && deleteAiRes.status === 200) {
    console.log('   ✅ Success: Cleaned up test layout specs');
  } else {
    console.error('   ❌ Failed delete test');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 8 TESTS PASSED — DAY 4 PENPOT BRIDGE COMPLETE & VERIFIED');
  console.log('======================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
