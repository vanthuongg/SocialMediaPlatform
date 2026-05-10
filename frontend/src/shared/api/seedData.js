import { mockDb } from './mockDb.js';

const MOCK_USERS = [
  {
    _id: 'user_admin',
    name: 'Admin User',
    username: 'admin',
    email: 'admin@nova.com',
    avatar: 'https://i.pravatar.cc/150?u=admin',
    coverImage: 'https://images.unsplash.com/photo-1506744269153-b016426461a2?q=80&w=1200&auto=format&fit=crop',
    bio: 'System Administrator of Nova',
    role: 'admin',
    isOnline: true,
    followersCount: 1540,
    followingCount: 120,
    createdAt: new Date('2025-01-01').toISOString()
  },
  {
    _id: 'user_mod',
    name: 'Moderator Jane',
    username: 'jane_mod',
    email: 'jane@nova.com',
    avatar: 'https://i.pravatar.cc/150?u=jane_mod',
    coverImage: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1200&auto=format&fit=crop',
    bio: 'Keeping the community safe 🛡️',
    role: 'moderator',
    isOnline: false,
    followersCount: 890,
    followingCount: 450,
    createdAt: new Date('2025-02-15').toISOString()
  },
  {
    _id: 'user_1',
    name: 'Alex Johnson',
    username: 'alex_j',
    email: 'alex@example.com',
    avatar: 'https://i.pravatar.cc/150?u=alex_j',
    coverImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop',
    bio: 'Photography enthusiast 📸 | Coffee lover ☕',
    role: 'user',
    isOnline: true,
    followersCount: 230,
    followingCount: 180,
    createdAt: new Date('2025-03-10').toISOString()
  },
  {
    _id: 'user_2',
    name: 'Sarah Connor',
    username: 'sarah_c',
    email: 'sarah@example.com',
    avatar: 'https://i.pravatar.cc/150?u=sarah_c',
    bio: 'Future depends on what we do in the present.',
    role: 'user',
    isOnline: true,
    followersCount: 550,
    followingCount: 100,
    createdAt: new Date('2025-04-05').toISOString()
  },
  {
    _id: 'user_3',
    name: 'Michael Chen',
    username: 'mike_chen',
    email: 'mike@example.com',
    avatar: 'https://i.pravatar.cc/150?u=mike_chen',
    bio: 'Frontend Developer | React & Vue',
    role: 'user',
    isOnline: false,
    followersCount: 1200,
    followingCount: 300,
    createdAt: new Date('2025-05-20').toISOString()
  }
];

const MOCK_POSTS = [
  {
    _id: 'post_1',
    author: MOCK_USERS[2], // Alex
    content: 'Just had the best coffee at this new place downtown! ☕ #coffee #morning',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=600&auto=format&fit=crop' }
    ],
    visibility: 'public',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    totalReactions: 15,
    reactionCounts: { like: 10, love: 5 },
    commentCount: 2,
    userReaction: null,
    isSaved: false
  },
  {
    _id: 'post_2',
    author: MOCK_USERS[4], // Mike
    content: 'Finally finished my new portfolio website built with React and TailwindCSS! Let me know what you guys think. 🚀\n#webdev #reactjs',
    media: [],
    visibility: 'public',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    totalReactions: 45,
    reactionCounts: { like: 20, love: 15, wow: 10 },
    commentCount: 1,
    userReaction: null,
    isSaved: true
  },
  {
    _id: 'post_3',
    author: MOCK_USERS[3], // Sarah
    content: 'Beautiful sunset today! 🌅',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1617152685369-4e6d1987d605?q=80&w=600&auto=format&fit=crop' }
    ],
    visibility: 'public',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    totalReactions: 80,
    reactionCounts: { love: 50, wow: 30 },
    commentCount: 0,
    userReaction: 'love',
    isSaved: false
  }
];

const MOCK_COMMENTS = [
  {
    _id: 'comment_1',
    post: 'post_1',
    author: MOCK_USERS[4], // Mike
    content: 'Looks amazing! Where is it?',
    likesCount: 2,
    isLiked: false,
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
    parentComment: null
  },
  {
    _id: 'comment_2',
    post: 'post_1',
    author: MOCK_USERS[2], // Alex
    content: 'It\'s called The Daily Grind. Highly recommend!',
    likesCount: 1,
    isLiked: true,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    parentComment: 'comment_1'
  },
  {
    _id: 'comment_3',
    post: 'post_2',
    author: MOCK_USERS[1], // Jane
    content: 'Great job Mike! The design is very clean.',
    likesCount: 5,
    isLiked: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    parentComment: null
  }
];

const MOCK_REPORTS = [
  {
    _id: 'report_1',
    type: 'post',
    targetId: 'post_1',
    reportedBy: MOCK_USERS[3],
    reason: 'spam',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

export async function seedMockData() {
  const isSeeded = await mockDb.get('isSeeded');
  if (isSeeded && isSeeded.length > 0 && isSeeded[0] === true) {
    console.log('Mock database already seeded.');
    return;
  }

  console.log('Seeding mock database...');
  await mockDb.set('users', MOCK_USERS);
  await mockDb.set('posts', MOCK_POSTS);
  await mockDb.set('comments', MOCK_COMMENTS);
  await mockDb.set('reports', MOCK_REPORTS);
  await mockDb.set('notifications', []);
  await mockDb.set('messages', []);
  await mockDb.set('isSeeded', [true]);
  console.log('Mock database seeded successfully.');
}
