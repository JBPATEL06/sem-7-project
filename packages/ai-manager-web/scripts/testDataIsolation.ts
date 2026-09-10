import fetch from 'node-fetch';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { ProjectModel, DiagramModel, UserModel, ActivityLogModel } from '../server/models/index.js';

const API_BASE = 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('🧪 MULTI-USER DATA ISOLATION & OWNERSHIP ENFORCEMENT TEST SUITE');
  console.log('================================================================\n');

  const ts = Date.now();
  const userAEmail = `user_a_${ts}@example.com`;
  const userBEmail = `user_b_${ts}@example.com`;
  const adminEmail = 'bhanderijeel8@gmail.com';
  const testPassword = 'Password@123';

  // -------------------------------------------------------------
  // 1. Create User A, User B, and authenticate Admin
  // -------------------------------------------------------------
  console.log('1️⃣ Registering User A and User B...');
  const regARes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password: testPassword })
  });
  const regAData = (await regARes.json()) as any;
  const tokenA = regAData.token;
  const userAId = regAData.user?.id;
  console.log(`   User A Registered: ${userAEmail} (ID: ${userAId}) - Status: ${regARes.status}`);

  const regBRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBEmail, password: testPassword })
  });
  const regBData = (await regBRes.json()) as any;
  const tokenB = regBData.token;
  const userBId = regBData.user?.id;
  console.log(`   User B Registered: ${userBEmail} (ID: ${userBId}) - Status: ${regBRes.status}`);

  // Admin Login
  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: 'Admin@123456' })
  });
  const adminData = (await adminLoginRes.json()) as any;
  const tokenAdmin = adminData.token;
  console.log(`   Admin Logged In: ${adminEmail} (Role: ${adminData.user?.role}) - Status: ${adminLoginRes.status}`);

  // -------------------------------------------------------------
  // 2. User A creates Project A & Diagram A; User B creates Project B & Diagram B
  // -------------------------------------------------------------
  console.log('\n2️⃣ Creating user-owned content...');
  const projAId = `proj-a-${ts}`;
  const createProjARes = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ projectId: projAId, projectName: 'Project Alpha (User A)' })
  });
  console.log(`   User A Created Project '${projAId}' - Status: ${createProjARes.status}`);

  const createDiagARes = await fetch(`${API_BASE}/api/diagrams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ projectId: projAId, name: 'Diagram Alpha (User A)', type: 'architecture' })
  });
  const diagAData = (await createDiagARes.json()) as any;
  const diagAId = diagAData.diagram?.id;
  console.log(`   User A Created Diagram '${diagAId}' - Status: ${createDiagARes.status}`);

  const projBId = `proj-b-${ts}`;
  const createProjBRes = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ projectId: projBId, projectName: 'Project Beta (User B)' })
  });
  console.log(`   User B Created Project '${projBId}' - Status: ${createProjBRes.status}`);

  const createDiagBRes = await fetch(`${API_BASE}/api/diagrams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ projectId: projBId, name: 'Diagram Beta (User B)', type: 'er_diagram' })
  });
  const diagBData = (await createDiagBRes.json()) as any;
  const diagBId = diagBData.diagram?.id;
  console.log(`   User B Created Diagram '${diagBId}' - Status: ${createDiagBRes.status}`);

  // -------------------------------------------------------------
  // 3. Test (a): User A's GET /api/projects only returns User A's project
  // -------------------------------------------------------------
  console.log('\n3️⃣ [Test A] Verifying Read Data Isolation for User A...');
  const listARes = await fetch(`${API_BASE}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const listAData = (await listARes.json()) as any;
  const userAProjects = listAData.projects.map((p: any) => p.projectId);
  const userAHasProjA = userAProjects.includes(projAId);
  const userAHasProjB = userAProjects.includes(projBId);
  console.log(`   User A Projects List: [${userAProjects.join(', ')}]`);
  console.log(`   Contains Project Alpha: ${userAHasProjA ? '✅ YES' : '❌ NO'}`);
  console.log(`   Contains Project Beta:  ${userAHasProjB ? '❌ LEAK DETECTED' : '✅ NO (ISOLATED)'}`);

  // User A Diagram list
  const diagListARes = await fetch(`${API_BASE}/api/diagrams`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const diagListAData = (await diagListARes.json()) as any;
  const userADiagrams = diagListAData.diagrams.map((d: any) => d.id);
  const userAHasDiagB = userADiagrams.includes(diagBId);
  console.log(`   Contains Diagram Beta:  ${userAHasDiagB ? '❌ LEAK DETECTED' : '✅ NO (ISOLATED)'}`);

  if (!userAHasProjA || userAHasProjB || userAHasDiagB) {
    throw new Error('Test A Failed: User A data is not properly isolated from User B!');
  }

  // -------------------------------------------------------------
  // 4. Test (b): User A attempting to PUT/DELETE User B's content gets 403 Forbidden
  // -------------------------------------------------------------
  console.log('\n4️⃣ [Test B] Verifying Ownership Access Control (Rejection with 403)...');

  // User A attempts to DELETE Project B
  const attackDelProjRes = await fetch(`${API_BASE}/api/projects/${projBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  console.log(`   User A DELETE Project B (${projBId}) -> Status: ${attackDelProjRes.status} (Expected: 403)`);

  // User A attempts to PUT Diagram B
  const attackPutDiagRes = await fetch(`${API_BASE}/api/diagrams/${diagBId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'HACKED Diagram Title' })
  });
  console.log(`   User A PUT Diagram B (${diagBId}) -> Status: ${attackPutDiagRes.status} (Expected: 403)`);

  // User A attempts to DELETE Diagram B
  const attackDelDiagRes = await fetch(`${API_BASE}/api/diagrams/${diagBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  console.log(`   User A DELETE Diagram B (${diagBId}) -> Status: ${attackDelDiagRes.status} (Expected: 403)`);

  if (attackDelProjRes.status !== 403 || attackPutDiagRes.status !== 403 || attackDelDiagRes.status !== 403) {
    throw new Error('Test B Failed: Cross-user mutation was not rejected with 403 Forbidden!');
  }
  console.log('   ✅ All cross-user unauthorized mutations successfully rejected with 403 Forbidden!');

  // -------------------------------------------------------------
  // 5. Test (c): Admin's GET /api/projects returns all projects
  // -------------------------------------------------------------
  console.log('\n5️⃣ [Test C] Verifying Admin Global Visibility...');
  const adminProjRes = await fetch(`${API_BASE}/api/projects`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` }
  });
  const adminProjData = (await adminProjRes.json()) as any;
  const adminProjects = adminProjData.projects.map((p: any) => p.projectId);
  const adminHasProjA = adminProjects.includes(projAId);
  const adminHasProjB = adminProjects.includes(projBId);
  console.log(`   Admin Projects Count: ${adminProjects.length}`);
  console.log(`   Admin sees Project Alpha: ${adminHasProjA ? '✅ YES' : '❌ NO'}`);
  console.log(`   Admin sees Project Beta:  ${adminHasProjB ? '✅ YES' : '❌ NO'}`);

  if (!adminHasProjA || !adminHasProjB) {
    throw new Error('Test C Failed: Admin does not have global visibility across all projects!');
  }
  console.log('   ✅ Admin global visibility verified!');

  // -------------------------------------------------------------
  // 6. Test (d): Verify MongoDB Atlas Data Migration on existing records
  // -------------------------------------------------------------
  console.log('\n6️⃣ [Test D] Checking MongoDB Atlas Migration Status on existing records...');
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 8000 });

  const unassignedProjects = await ProjectModel.countDocuments({
    $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }]
  });
  const totalProjectsInDb = await ProjectModel.countDocuments();
  const projectsWithUserId = await ProjectModel.countDocuments({ userId: { $exists: true, $ne: '' } });

  const unassignedDiagrams = await DiagramModel.countDocuments({
    $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }]
  });
  const totalDiagramsInDb = await DiagramModel.countDocuments();

  console.log(`   Projects in Atlas: Total=${totalProjectsInDb} | With Valid userId=${projectsWithUserId} | Unassigned=${unassignedProjects}`);
  console.log(`   Diagrams in Atlas: Total=${totalDiagramsInDb} | Unassigned=${unassignedDiagrams}`);

  if (unassignedProjects > 0 || unassignedDiagrams > 0) {
    throw new Error('Test D Failed: Legacy unassigned records still exist without userId!');
  }
  console.log('   ✅ 100% of Atlas database records have valid userId ownership assigned!');

  // -------------------------------------------------------------
  // Clean up test data
  // -------------------------------------------------------------
  console.log('\n🧹 Cleaning up test users and projects...');
  await fetch(`${API_BASE}/api/projects/${projAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  await fetch(`${API_BASE}/api/diagrams/${diagAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  await fetch(`${API_BASE}/api/projects/${projBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  await fetch(`${API_BASE}/api/diagrams/${diagBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  await UserModel.deleteOne({ email: userAEmail });
  await UserModel.deleteOne({ email: userBEmail });
  await mongoose.disconnect();
  console.log('   ✅ Cleaned up temporary test entities.');

  console.log('\n================================================================');
  console.log('🎉 ALL MULTI-USER DATA ISOLATION & OWNERSHIP CHECKS PASSED!');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('❌ Data Isolation Test failed:', err);
  process.exit(1);
});
