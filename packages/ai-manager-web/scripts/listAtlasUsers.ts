import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://bhanderijeel8_db_user:RYgF2uLvw4DhtVwo@cluster0.cgdh1pm.mongodb.net/ai_manager?retryWrites=true&w=majority';

async function listUsers() {
  await mongoose.connect(uri);
  const userCol = mongoose.connection.db?.collection('users');
  const users = await userCol?.find().toArray();
  console.log('MongoDB Atlas Users in ai_manager DB:');
  console.log(JSON.stringify(users?.map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt })), null, 2));
  await mongoose.disconnect();
}

listUsers();
