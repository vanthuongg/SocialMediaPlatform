/**
 * Seed script: Create sample groups, settings, memberships, and posts.
 * Usage: node scripts/seed-groups.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Import Schemas directly or dynamically
import User from '../src/features/users/users.model.js';
import {
  Group,
  GroupMember,
  GroupSettings,
  GroupRule,
  GroupPost
} from '../src/features/groups/groups.model.js';
import Reel from '../src/features/reels/reels.model.js';
import { seedReels } from '../src/features/reels/reels.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI not found in .env');
  process.exit(1);
}

const sampleGroups = [
  {
    name: 'JavaScript Wizards',
    description: 'A community for JavaScript, TypeScript, and modern web development enthusiasts. Share tips, code snippets, and framework updates!',
    category: 'Technology',
    privacy: 'public',
    tags: ['javascript', 'typescript', 'react', 'nodejs', 'webdev'],
    avatar: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=150',
    cover: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800',
    rules: [
      { title: 'Be Respectful', detail: 'Treat others with respect. Harassment, hate speech, or abuse will result in an immediate ban.' },
      { title: 'No Spam', detail: 'Only share relevant programming resources, articles, and questions. Promotional spam is prohibited.' },
      { title: 'Format Your Code', detail: 'When posting code snippets, please format them nicely or use link-sharing services like GitHub Gists.' }
    ],
    posts: [
      { content: 'Welcome to the JavaScript Wizards group! Feel free to introduce yourselves and share what frameworks you are currently using.' },
      { content: 'Tip of the day: Use Optional Chaining (?.) and Nullish Coalescing (??) to write cleaner conditional checks in your code!' }
    ]
  },
  {
    name: 'Lo-Fi Chill & Beats',
    description: 'The perfect spot to share lo-fi hip hop, synthwave tracks, and relax with fellow music lovers while studying or working.',
    category: 'Music',
    privacy: 'public',
    tags: ['lofi', 'chill', 'music', 'beats', 'study'],
    avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150',
    cover: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=800',
    rules: [
      { title: 'Share Good Vibes Only', detail: 'Keep the atmosphere relaxing and friendly.' },
      { title: 'Credit Artists', detail: 'Whenever you share tracks or art, please credit the original creator.' }
    ],
    posts: [
      { content: 'What is your favorite lo-fi track for coding? Drop your links below 🎧' }
    ]
  },
  {
    name: 'Pixel Art Creators',
    description: 'A creative space for pixel artists, game developers, and retro aesthetic lovers. Showcase your art, get feedback, and join challenges.',
    category: 'Art',
    privacy: 'public',
    tags: ['pixelart', 'retro', 'drawing', 'gamedev', 'aseprite'],
    avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150',
    cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
    rules: [
      { title: 'Constructive Feedback Only', detail: 'When critiques are requested, keep them constructive and supportive.' },
      { title: 'Post Original Work or Credit', detail: 'Plagiarism is strictly prohibited. Credit references if applicable.' }
    ],
    posts: [
      { content: 'Weekly Prompt: "Futuristic Cafe". Create a 64x64 canvas piece and share your submissions in this thread!' }
    ]
  },
  {
    name: 'Nova Exclusive Club',
    description: 'A private circle for discussing inner-circle topics, platform suggestions, and hanging out. Invitation or approval only.',
    category: 'Social',
    privacy: 'private',
    tags: ['exclusive', 'nova', 'lounge', 'private'],
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    rules: [
      { title: 'Keep It Confidential', detail: 'What is shared in the club stays in the club.' }
    ],
    posts: [
      { content: 'Secret update: We are testing out some fresh animations for the dashboard. Stay tuned, team!' }
    ]
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Fetch users to populate creators & members
  const users = await User.find().limit(10);
  if (users.length === 0) {
    console.error('❌ No users found in database. Run npm run seed-admin or register users first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found ${users.length} users in database. Proceeding to seed groups...`);

  // Clear existing group-related collections
  await Promise.all([
    Group.deleteMany({}),
    GroupMember.deleteMany({}),
    GroupSettings.deleteMany({}),
    GroupRule.deleteMany({}),
    GroupPost.deleteMany({})
  ]);
  console.log('🧹 Cleared existing group records');

  for (let idx = 0; idx < sampleGroups.length; idx++) {
    const sGroup = sampleGroups[idx];
    
    // Pick a creator from existing users
    const creator = users[idx % users.length];
    
    // 1. Create Group
    const group = await Group.create({
      name: sGroup.name,
      description: sGroup.description,
      category: sGroup.category,
      privacy: sGroup.privacy,
      tags: sGroup.tags,
      avatar: sGroup.avatar,
      cover: sGroup.cover,
      creator: creator._id
    });
    console.log(`\n📦 Group [${group.privacy}] "${group.name}" created (Creator: @${creator.username})`);

    // 2. Create Default Group Settings
    await GroupSettings.create({
      group: group._id,
      postModeration: false,
      membershipApprovalRequired: false,
      joinQuestions: []
    });

    // 3. Add Creator as Owner
    await GroupMember.create({
      group: group._id,
      user: creator._id,
      role: 'owner'
    });

    // 4. Add other users as random members / admins / moderators
    const otherUsers = users.filter(u => u._id.toString() !== creator._id.toString());
    const roles = ['admin', 'moderator', 'member', 'member'];
    
    for (let rIdx = 0; rIdx < Math.min(otherUsers.length, 4); rIdx++) {
      const user = otherUsers[rIdx];
      const role = roles[rIdx % roles.length];
      
      await GroupMember.create({
        group: group._id,
        user: user._id,
        role: role
      });
      console.log(`  ➕ Added member @${user.username} as role: ${role}`);
    }

    // 5. Create Group Rules
    for (const rule of sGroup.rules) {
      await GroupRule.create({
        group: group._id,
        title: rule.title,
        detail: rule.detail
      });
    }
    console.log(`  📝 Created ${sGroup.rules.length} group rules`);

    // 6. Create Group Posts
    for (const post of sGroup.posts) {
      // Pick a random member/owner to be the author
      const members = await GroupMember.find({ group: group._id });
      const randomMember = members[Math.floor(Math.random() * members.length)];

      await GroupPost.create({
        group: group._id,
        author: randomMember.user,
        content: post.content,
        isApproved: true
      });
    }
    console.log(`  ✍️  Created ${sGroup.posts.length} sample posts`);
  }

  // Seeding reels
  console.log('\n🎬 Seeding reels...');
  await Reel.deleteMany({});
  await seedReels(users[0]._id);
  console.log('✅ Reels seeded successfully!');

  await mongoose.disconnect();
  console.log('\n🎉 Group & Reel seeding complete!');
}

seed().catch(err => {
  console.error('❌ Group seeding failed:', err.message);
  process.exit(1);
});
