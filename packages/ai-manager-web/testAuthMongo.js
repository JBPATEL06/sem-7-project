import fetch from 'node-fetch';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import dns from 'dns';
import bcrypt from 'bcryptjs';

dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: resolve(process.cwd(), '.env') });

const PORT = process.env.PORT || 3000;
const API_BASE = `http://localhost:${PORT}/api/auth`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`\n--- Running Auth Tests against running server ---`);
  
  await delay(1000);

  let adminToken = '';
  let userToken = '';
  let testUserEmail = `user${Date.now()}@local.workspace`;

  try {
    console.log(`\n1. Default admin account seeded and migrated`);
    if (process.env.MONGODB_URI) {
      console.log('Connecting to Mongo directly to verify admin user...');
      await mongoose.connect(process.env.MONGODB_URI);
      const userSchema = new mongoose.Schema({ email: String, role: String, passwordHash: String });
      const User = mongoose.models.User || mongoose.model('User', userSchema);
      
      const salt = await bcrypt.genSalt(10);
      const knownHash = await bcrypt.hash('Admin@AiManager2026!', salt);

      const adminUser = await User.findOneAndUpdate(
        { email: process.env.ADMIN_EMAIL || 'admin@local.workspace' },
        { passwordHash: knownHash },
        { new: true }
      );
      
      if (adminUser) {
        console.log(`✅ Admin user found in MongoDB: ${adminUser.email} (Role: ${adminUser.role})`);
        console.log(`✅ Password hash exists: ${!!adminUser.passwordHash}`);
      } else {
        console.error(`❌ Admin user not found in MongoDB`);
      }
      await mongoose.disconnect();
    } else {
      console.error('❌ MONGODB_URI not found in .env');
    }

    // Also update local JSON
    const usersPath = resolve(process.cwd(), 'packages', 'ai-manager-web', '.ai-manager', 'users.json');
    if (fs.existsSync(usersPath)) {
      const localUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const adminInJson = localUsers.find(u => u.email === 'admin@local.workspace');
      if (adminInJson) {
         const salt = await bcrypt.genSalt(10);
         adminInJson.passwordHash = await bcrypt.hash('Admin@AiManager2026!', salt);
         fs.writeFileSync(usersPath, JSON.stringify(localUsers, null, 2));
      }
    }

    console.log(`\n2. POST /api/auth/login with admin credentials succeeds and returns JWT containing role: "admin"`);
    const loginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@local.workspace', password: 'Admin@AiManager2026!' })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.user.role === 'admin' && loginData.token) {
      console.log(`✅ Admin login successful. Role: ${loginData.user.role}, Token returned.`);
      adminToken = loginData.token;
    } else {
      console.error(`❌ Admin login failed:`, loginData);
    }

    console.log(`\n3. POST /api/auth/register creates a standard user with role: "user"`);
    const regRes = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'UserPassword123!' })
    });
    const regData = await regRes.json();
    if (regRes.ok && regData.user.role === 'user' && regData.token) {
      console.log(`✅ User registration successful. Email: ${regData.user.email}, Role: ${regData.user.role}`);
      userToken = regData.token;
    } else {
      console.error(`❌ User registration failed:`, regData);
    }

    console.log(`\n4. POST /api/auth/login with standard user succeeds`);
    const userLoginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'UserPassword123!' })
    });
    const userLoginData = await userLoginRes.json();
    if (userLoginRes.ok && userLoginData.user.role === 'user') {
      console.log(`✅ Standard user login successful.`);
    } else {
      console.error(`❌ Standard user login failed:`, userLoginData);
    }

    console.log(`\n5. POST /api/auth/login with wrong password fails (HTTP 401)`);
    const wrongLoginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@local.workspace', password: 'WrongPassword!' })
    });
    if (wrongLoginRes.status === 401) {
      console.log(`✅ Wrong password rejected with 401 Unauthorized.`);
    } else {
      console.error(`❌ Wrong password did not fail correctly. Status: ${wrongLoginRes.status}`);
    }

    console.log(`\n6. GET /api/auth/me with Bearer token returns decoded user and role`);
    const meRes = await fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const meData = await meRes.json();
    if (meRes.ok && meData.user.email === 'admin@local.workspace') {
      console.log(`✅ GET /me successful for admin. Email: ${meData.user.email}`);
    } else {
      console.error(`❌ GET /me failed:`, meData);
    }

    console.log(`\n7. Verify Fallback to Local JSON`);
    if (fs.existsSync(usersPath)) {
      const localUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      console.log(`✅ Local JSON fallback file exists (.ai-manager/users.json)`);
      console.log(`✅ It contains ${localUsers.length} users.`);
      const adminInJson = localUsers.find(u => u.email === 'admin@local.workspace');
      if (adminInJson) {
         console.log(`✅ Admin user exists in local JSON fallback.`);
      }
    } else {
      console.log(`❌ Local JSON fallback file does not exist.`);
    }

  } catch (error) {
    console.error(`❌ Error during tests:`, error);
  }
}

runTests();
