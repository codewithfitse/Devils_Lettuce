import mongoose from 'mongoose';
import User, { ROLES } from '../models/User.js';
import env from '../config/env.js';
import { connectDB } from '../config/db.js';

async function seed() {
  await connectDB();

  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) {
    console.log('Super admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@devilslettuce.com',
    password: process.env.ADMIN_PASSWORD || 'admin123456',
    role: ROLES.SUPER_ADMIN,
    permissions: { canSell: true, canDeliver: true },
  });

  console.log('Super admin created:', admin.email);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
