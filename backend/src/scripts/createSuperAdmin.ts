import { connectDB } from '../config/database.js';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function createSuperAdmin() {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('✅ Super admin already exists');
      
      // Всегда обновляем роль на admin
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ Super admin role updated to admin');
      console.log(`Current role: ${existingAdmin.role}`);
      
      process.exit(0);
    }

    const superAdmin = new User({
      username: 'admin',
      displayName: 'Super Admin',
      email: 'admin@chatreal.local',
      password: '123123',
      role: 'admin'
    });

    await superAdmin.save();
    console.log('✅ Super admin created successfully');
    console.log('Username: admin');
    console.log('Password: 123123');
    console.log('⚠️  Change password in production!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
