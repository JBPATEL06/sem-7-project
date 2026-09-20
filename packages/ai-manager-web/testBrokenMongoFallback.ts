import express from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load env but explicitly override MONGODB_URI with a broken/invalid connection string
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Break MONGODB_URI
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27099/non_existent_db_fail_fast?connectTimeoutMS=500&serverSelectionTimeoutMS=500';
import { authRouter as authR, initMongoAndMigrate as initMongo } from './server/modules/auth/index.js';
import { adminRouter as adminR } from './server/modules/admin/index.js';

async function testBrokenMongoFallback() {
  console.log('=== TEST: PROVING MONGODB_URI FALLBACK TO LOCAL JSON ===');
  
  // 1. Initialize Mongo with broken URI
  console.log('\nStep 1: Attempting Mongo Init with broken URI...');
  const connected = await initMongo();
  console.log(`initMongoAndMigrate returned: ${connected} (Expected: false)`);
  if (connected) {
    console.error('FAIL: Mongo unexpectedly succeeded with broken URI');
    process.exit(1);
  }

  // 2. Start temporary express test server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authR);
  app.use('/api/admin', adminR);

  const server = app.listen(3099);
  const BASE_URL = 'http://127.0.0.1:3099';

  try {
    // 3. Login as Admin in Fallback Mode
    console.log('\nStep 2: POST /api/auth/login as admin (fallback mode)');
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@local.workspace', password: 'Admin@AiManager2026!' })
    });
    const adminData = await adminRes.json() as any;
    console.log(`Admin Login Status: ${adminRes.status}, role: ${adminData?.user?.role}, hasToken: ${!!adminData?.token}`);
    if (adminRes.status !== 200 || adminData?.user?.role !== 'admin') {
      throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
    }
    const adminToken = adminData.token;

    // 4. Register a new user in Fallback Mode
    const testEmail = `fallback_test_${Date.now()}@local.workspace`;
    console.log(`\nStep 3: POST /api/auth/register for ${testEmail} (fallback mode)`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    });
    const regData = await regRes.json() as any;
    console.log(`Register Status: ${regRes.status}, role: ${regData?.user?.role}, id: ${regData?.user?.id}`);
    if (regRes.status !== 201 || regData?.user?.role !== 'user') {
      throw new Error(`Register failed: ${JSON.stringify(regData)}`);
    }
    const newUserId = regData.user.id;

    // 5. Verify user is in local .ai-manager/users.json
    console.log('\nStep 4: Verifying .ai-manager/users.json on disk');
    const usersFile = path.resolve(process.cwd(), '.ai-manager/users.json');
    const diskUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const foundOnDisk = diskUsers.find((u: any) => u.email === testEmail);
    console.log(`Found on disk: ${!!foundOnDisk}, disk user role: ${foundOnDisk?.role}`);
    if (!foundOnDisk) throw new Error('New user not persisted to users.json');

    // 6. Login as new user in Fallback Mode
    console.log('\nStep 5: POST /api/auth/login with newly registered user');
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Password123!' })
    });
    const userLoginData = await userLoginRes.json() as any;
    console.log(`User Login Status: ${userLoginRes.status}, role: ${userLoginData?.user?.role}`);
    if (userLoginRes.status !== 200 || userLoginData?.user?.role !== 'user') {
      throw new Error(`User login failed: ${JSON.stringify(userLoginData)}`);
    }
    const userToken = userLoginData.token;

    // 7. Test Admin Overview endpoint
    console.log('\nStep 6: GET /api/admin/overview as Admin');
    const overviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const overviewData = await overviewRes.json() as any;
    console.log(`Admin Overview Status: ${overviewRes.status}, mongoStore: ${overviewData?.systemHealth?.mongoStore}`);

    // 8. Test Regular User Forbidden from Admin endpoint (RBAC check)
    console.log('\nStep 7: GET /api/admin/overview as Regular User (Must fail 403)');
    const forbiddenRes = await fetch(`${BASE_URL}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log(`Regular User Admin Access Status: ${forbiddenRes.status} (Expected: 403)`);
    if (forbiddenRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin, got ${forbiddenRes.status}`);
    }

    // 9. Clean up test user
    console.log('\nStep 8: DELETE /api/admin/users/:id as Admin');
    const delRes = await fetch(`${BASE_URL}/api/admin/users/${newUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`Delete User Status: ${delRes.status}`);
    const diskUsersAfter = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const foundAfter = diskUsersAfter.find((u: any) => u.id === newUserId);
    console.log(`Found on disk after deletion: ${!!foundAfter} (Expected: false)`);

    console.log('\n✅ ALL FALLBACK TESTS PASSED WITH BROKEN MONGODB_URI!');
  } finally {
    server.close();
  }
}

testBrokenMongoFallback().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
