import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://bhanderijeel8_db_user:RYgF2uLvw4DhtVwo@cluster0.cgdh1pm.mongodb.net/ai_manager?retryWrites=true&w=majority';

async function promoteOwner() {
  await mongoose.connect(uri);
  const userCol = mongoose.connection.db?.collection('users');
  
  // Set bhanderijeel8@gmail.com, bhanderijeel80@gmail.com, jbhanderi976@gmail.com to admin
  const ownerEmails = ['bhanderijeel8@gmail.com', 'bhanderijeel80@gmail.com', 'jbhanderi976@gmail.com'];
  
  const res = await userCol?.updateMany(
    { email: { $in: ownerEmails } },
    { $set: { role: 'admin' } }
  );
  
  console.log(`Updated ${res?.modifiedCount} owner accounts to role 'admin' in MongoDB Atlas.`);
  
  const updated = await userCol?.find({ email: { $in: ownerEmails } }).toArray();
  console.log('Owner accounts in Atlas:', updated?.map(u => ({ email: u.email, role: u.role })));
  
  await mongoose.disconnect();
}

promoteOwner();
