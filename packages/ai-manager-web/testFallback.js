import fetch from 'node-fetch';

const PORT = 3000;
const API_BASE = `http://localhost:${PORT}/api/auth`;

async function runFallbackTests() {
  console.log(`\n--- Running Fallback Tests against running server ---`);

  try {
    console.log(`\n1. POST /api/auth/login with admin credentials in Fallback Mode`);
    const loginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@local.workspace', password: 'Admin@AiManager2026!' })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.user.role === 'admin' && loginData.token) {
      console.log(`✅ Admin login successful in fallback mode. Role: ${loginData.user.role}, Token returned.`);
    } else {
      console.error(`❌ Admin login failed:`, loginData);
    }

    let testUserEmail = `fallback_user${Date.now()}@local.workspace`;
    console.log(`\n2. POST /api/auth/register creates a standard user in Fallback Mode`);
    const regRes = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'UserPassword123!' })
    });
    const regData = await regRes.json();
    if (regRes.ok && regData.user.role === 'user' && regData.token) {
      console.log(`✅ User registration successful. Email: ${regData.user.email}`);
    } else {
      console.error(`❌ User registration failed:`, regData);
    }

    console.log(`\n3. POST /api/auth/login with the new standard user succeeds in Fallback Mode`);
    const userLoginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'UserPassword123!' })
    });
    const userLoginData = await userLoginRes.json();
    if (userLoginRes.ok && userLoginData.user.role === 'user') {
      console.log(`✅ Standard user login successful in fallback mode.`);
    } else {
      console.error(`❌ Standard user login failed:`, userLoginData);
    }

  } catch (error) {
    console.error(`❌ Error during fallback tests:`, error);
  }
}

runFallbackTests();
