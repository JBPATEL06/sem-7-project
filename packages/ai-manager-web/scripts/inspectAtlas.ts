import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { UserModel } from '../server/auth.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to URI:', uri ? uri.replace(/:[^:]*@/, ':****@') : 'NONE');
  await mongoose.connect(uri!, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected!');

  const collections = await mongoose.connection.db?.listCollections().toArray();
  console.log('Collections in database:');
  for (const c of collections || []) {
    console.log(` - ${c.name}`);
  }

  const users = await UserModel.find().lean();
  console.log(`\nTotal Users (${users.length}):`);
  for (const u of users) {
    console.log(` - Email: ${u.email.padEnd(35)} | Role: ${u.role.padEnd(6)} | ID: ${u.id}`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
