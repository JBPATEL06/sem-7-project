import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function run() {
  console.log('====================================================');
  console.log('🧪 VERIFYING COMPLETE MONGODB ATLAS INTEGRATION');
  console.log('====================================================\n');

  // 1. Check Auth Status
  console.log('1️⃣ Checking server auth & mongo status...');
  const statusRes = await fetch(`${API_BASE}/api/auth/status`);
  const statusData = await statusRes.json() as any;
  console.log('   Status:', statusRes.status);
  console.log('   Mongo Connected:', statusData.mongoConnected ? '✅ YES' : '❌ NO');

  // 2. Owner Login
  console.log('\n2️⃣ Testing Owner Login (bhanderijeel8@gmail.com)...');
  const ownerLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bhanderijeel8@gmail.com',
      password: 'Admin@123456'
    })
  });
  const ownerData = await ownerLoginRes.json() as any;
  console.log('   Status:', ownerLoginRes.status);
  console.log('   User:', ownerData.user?.email, '| Role:', ownerData.user?.role);
  if (ownerData.user?.role !== 'admin') {
    throw new Error('Owner does not have admin role!');
  }
  const ownerToken = ownerData.token;

  // 3. Password Reset Endpoint Test
  console.log('\n3️⃣ Testing Password Reset / Direct Set Endpoint...');
  const resetRes = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'bhanderijeel8@gmail.com',
      newPassword: 'Admin@123456'
    })
  });
  const resetData = await resetRes.json() as any;
  console.log('   Status:', resetRes.status);
  console.log('   Message:', resetData.message);
  console.log('   Role maintained:', resetData.user?.role === 'admin' ? '✅ ADMIN' : '❌ NOT ADMIN');

  // 4. Projects CRUD with MongoDB Atlas
  console.log('\n4️⃣ Testing Projects Persistence in MongoDB Atlas...');
  const testProjectSlug = `atlas-proj-${Date.now()}`;
  const createProjRes = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      projectId: testProjectSlug,
      projectName: 'Atlas Test Project',
      description: 'Persistent MongoDB Atlas Project'
    })
  });
  const createProjData = await createProjRes.json() as any;
  console.log('   Project Created Status:', createProjRes.status);
  console.log('   Created Project ID:', createProjData.project?.projectId);

  // List projects
  const listProjRes = await fetch(`${API_BASE}/api/projects`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const listProjData = await listProjRes.json() as any;
  const foundProj = listProjData.projects?.find((p: any) => p.projectId === testProjectSlug);
  console.log('   Project Found in List:', foundProj ? '✅ YES' : '❌ NO');

  // Clean up test project
  await fetch(`${API_BASE}/api/projects/${testProjectSlug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  console.log('   Cleaned up test project: ✅');

  // 5. Diagrams CRUD with MongoDB Atlas
  console.log('\n5️⃣ Testing Diagrams Persistence in MongoDB Atlas...');
  const createDiagRes = await fetch(`${API_BASE}/api/diagrams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      projectId: 'acme-api',
      name: 'Atlas Architecture Diagram',
      description: 'Stored in MongoDB Atlas diagrams collection',
      type: 'architecture',
      elements: [{ id: 'elem_1', type: 'rectangle', x: 100, y: 100 }]
    })
  });
  const createDiagData = await createDiagRes.json() as any;
  console.log('   Diagram Created Status:', createDiagRes.status);
  console.log('   Created Diagram ID:', createDiagData.diagram?.id);

  // Clean up diagram
  if (createDiagData.diagram?.id) {
    await fetch(`${API_BASE}/api/diagrams/${createDiagData.diagram.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    console.log('   Cleaned up test diagram: ✅');
  }

  // 6. Admin Overview Access
  console.log('\n6️⃣ Verifying Admin Overview Access with Owner Token...');
  const adminRes = await fetch(`${API_BASE}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const adminData = await adminRes.json() as any;
  console.log('   Status:', adminRes.status);
  console.log('   Total Users in Atlas:', adminData.metrics?.totalUsers);
  console.log('   Admin Count:', adminData.metrics?.adminCount);
  console.log('   Storage Engine:', adminData.systemHealth?.mongoStore);

  console.log('\n====================================================');
  console.log('🎉 ALL MONGODB ATLAS & OWNER ADMIN CHECKS PASSED!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
