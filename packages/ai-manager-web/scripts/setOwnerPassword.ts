import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://bhanderijeel8_db_user:RYgF2uLvw4DhtVwo@cluster0.cgdh1pm.mongodb.net/ai_manager?retryWrites=true&w=majority';

async function setPassword() {
  await mongoose.connect(uri);
  const userCol = mongoose.connection.db?.collection('users');
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123456', salt);
  
  const emails = ['bhanderijeel8@gmail.com', 'bhanderijeel80@gmail.com', 'jbhanderi976@gmail.com'];
  
  const res = await userCol?.updateMany(
    { email: { $in: emails } },
    { $set: { passwordHash, role: 'admin' } }
  );
  
  console.log(`Updated password and role=admin for ${res?.modifiedCount} owner accounts in MongoDB Atlas.`);
  await mongoose.disconnect();
}

setPassword();
