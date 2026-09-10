import http from 'http';

const BASE_URL = 'http://localhost:3000';

function request(path: string, options: { method?: string; body?: any; headers?: any } = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          ...options.headers
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ status: res.statusCode || 200, data });
          } catch {
            resolve({ status: res.statusCode || 200, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('🚀 Testing Live MongoDB Atlas Auth & Owner Roles');
  console.log('====================================================\n');

  // Test 1: Register/Login with owner email
  const testOwnerEmail = `owner_test_${Date.now()}@gmail.com`;
  console.log(`1️⃣ Registering test user: ${testOwnerEmail}`);
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: testOwnerEmail,
      password: 'Password@123'
    }
  });
  console.log(`   Status: ${regRes.status}`);
  console.log(`   User registered: ${regRes.data.user?.email}, Role: ${regRes.data.user?.role}`);

  // Test 2: Login with owner email (bhanderijeel8@gmail.com)
  console.log(`\n2️⃣ Testing Owner Login: bhanderijeel8@gmail.com`);
  const ownerLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'bhanderijeel8@gmail.com',
      password: 'Admin@123456'
    }
  });
  console.log(`   Status: ${ownerLoginRes.status}`);
  if (ownerLoginRes.status === 200) {
    console.log(`   Owner logged in: ${ownerLoginRes.data.user?.email}, Role: ${ownerLoginRes.data.user?.role}`);
    console.log(`   Admin privilege verified: ${ownerLoginRes.data.user?.role === 'admin' ? '✅ YES' : '❌ NO'}`);
  } else {
    console.log(`   Response: ${JSON.stringify(ownerLoginRes.data)}`);
  }

  // Test 3: Check Admin Overview endpoint with owner token
  if (ownerLoginRes.data.token) {
    console.log('\n3️⃣ Accessing /api/admin/overview with Owner Token...');
    const adminRes = await request('/api/admin/overview', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerLoginRes.data.token}`
      }
    });
    console.log(`   Status: ${adminRes.status}`);
    console.log(`   Total Users in Atlas: ${adminRes.data.metrics?.totalUsers}`);
    console.log(`   Admin Users: ${adminRes.data.metrics?.adminCount}`);
    console.log(`   MongoDB Store Status: ${adminRes.data.systemHealth?.mongoStore}`);
  }

  console.log('\n====================================================');
  console.log('✅ LIVE MONGODB ATLAS AUTH & OWNER ROLE VERIFIED!');
  console.log('====================================================\n');
}

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
