import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI || 'mongodb+srv://bhanderijeel8_db_user:RYgF2uLvw4DhtVwo@cluster0.cgdh1pm.mongodb.net/ai_manager?retryWrites=true&w=majority';

console.log('Testing Atlas URI:', uri.replace(/:([^:@]+)@/, ':****@'));

async function test() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Check collections / list databases
    const admin = mongoose.connection.db?.admin();
    const dbs = await admin?.listDatabases();
    console.log('Databases:', dbs?.databases.map((d: any) => d.name));
    
    // Insert / query a test user
    const userCol = mongoose.connection.db?.collection('users');
    const count = await userCol?.countDocuments();
    console.log('Users collection count:', count);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Connection error:', err.message);
    console.error('Error code / reason:', err.code, err.reason);
    process.exit(1);
  }
}

test();
