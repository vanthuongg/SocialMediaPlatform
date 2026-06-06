/**
 * Seed script: Create admin and moderator accounts.
 * Usage: node scripts/seed-admin.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI not found in .env');
  process.exit(1);
}

// ── Minimal inline schema (avoids importing the full app) ──────────────────
const userSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true },
    username:        { type: String, required: true, unique: true, lowercase: true },
    email:           { type: String, required: true, unique: true, lowercase: true },
    password:        { type: String, required: true, select: false },
    role:            { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

// ── Accounts to seed ────────────────────────────────────────────────────────
const accounts = [
  {
    name:     'Administrator',
    username: 'admin',
    email:    'admin@nova.social',
    password: 'Admin@123456',
    role:     'admin',
  },
  {
    name:     'Moderator',
    username: 'moderator',
    email:    'moderator@nova.social',
    password: 'Moderator@123456',
    role:     'moderator',
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅  MongoDB connected');

  for (const acc of accounts) {
    const existing = await User.findOne({ $or: [{ email: acc.email }, { username: acc.username }] });

    if (existing) {
      console.log(`⚠️   [${acc.role}] "${acc.username}" already exists — skipped`);
      continue;
    }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(acc.password, salt);

    await User.create({ ...acc, password: hashed });
    console.log(`✅  [${acc.role}] "${acc.username}" created  (password: ${acc.password})`);
  }

  await mongoose.disconnect();
  console.log('\n🎉  Seed complete.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
