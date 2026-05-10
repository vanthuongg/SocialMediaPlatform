import MockAdapter from 'axios-mock-adapter';
import { mockDb } from './mockDb.js';

export function setupMockAdapter(axiosInstance) {
  // Pass through auth endpoints or just mock them too
  const mock = new MockAdapter(axiosInstance, { delayResponse: 500 });

  // AUTH (Basic mock)
  mock.onPost('/api/v1/auth/login').reply(async (config) => {
    const { email } = JSON.parse(config.data);
    const users = await mockDb.getUsers();
    const user = users.find(u => u.email === email) || users[0]; // fallback to first user
    return [200, { success: true, data: { user, accessToken: 'mock_token' } }];
  });
  
  mock.onGet('/api/v1/auth/me').reply(async () => {
    const users = await mockDb.getUsers();
    return [200, { success: true, data: { user: users[0] } }];
  });

  // POSTS
  mock.onGet('/api/v1/posts').reply(async () => {
    const posts = await mockDb.getPosts();
    return [200, { success: true, data: { posts } }];
  });

  mock.onGet(/\/api\/v1\/posts\/.+/).reply(async (config) => {
    const id = config.url.split('/').pop();
    const post = await mockDb.getPostById(id);
    return post ? [200, { success: true, data: { post } }] : [404, { success: false, error: { message: 'Not found' } }];
  });

  mock.onPost('/api/v1/posts').reply(async (config) => {
    const data = JSON.parse(config.data);
    const users = await mockDb.getUsers();
    const newPost = await mockDb.add('posts', {
      ...data,
      author: users[0], // current user mock
      totalReactions: 0,
      reactionCounts: {},
      commentCount: 0,
      userReaction: null,
      isSaved: false
    });
    return [201, { success: true, data: { post: newPost } }];
  });

  // REACT POST
  mock.onPost(/\/api\/v1\/posts\/[^\/]+\/react/).reply(async (config) => {
    const postId = config.url.split('/')[3];
    const { type } = JSON.parse(config.data);
    
    let updatedPost = await mockDb.update('posts', postId, (post) => {
      let newCounts = { ...post.reactionCounts };
      let newTotal = post.totalReactions;
      
      if (post.userReaction) {
        newCounts[post.userReaction] = Math.max(0, (newCounts[post.userReaction] || 1) - 1);
        newTotal = Math.max(0, newTotal - 1);
      }
      
      if (post.userReaction === type) {
        return { ...post, userReaction: null, reactionCounts: newCounts, totalReactions: newTotal };
      }
      
      newCounts[type] = (newCounts[type] || 0) + 1;
      return { 
        ...post, 
        userReaction: type, 
        reactionCounts: newCounts, 
        totalReactions: newTotal + 1 
      };
    });
    
    return [200, { success: true, data: { post: updatedPost } }];
  });

  // GET POST REACTIONS
  mock.onGet(/\/api\/v1\/posts\/[^\/]+\/reactions/).reply(async (config) => {
    const postId = config.url.split('/')[3];
    const post = await mockDb.getPostById(postId);
    const users = await mockDb.getUsers();
    
    // Simulate list of reactions
    let mockReactionsList = [];
    if (post && post.reactionCounts) {
      let uIdx = 0;
      Object.entries(post.reactionCounts).forEach(([type, count]) => {
        for(let i=0; i<Math.min(count, 5); i++) {
          mockReactionsList.push({
            type,
            user: users[uIdx % users.length]
          });
          uIdx++;
        }
      });
    }
    return [200, { success: true, data: { reactions: mockReactionsList } }];
  });

  // COMMENTS

  mock.onGet(/\/api\/v1\/posts\/[^\/]+\/comments/).reply(async (config) => {
    const postId = config.url.split('/')[3];
    const comments = await mockDb.getCommentsByPostId(postId);
    return [200, { success: true, data: { comments } }];
  });

  mock.onPost(/\/api\/v1\/posts\/[^\/]+\/comments/).reply(async (config) => {
    const postId = config.url.split('/')[3];
    const { content, parentComment } = JSON.parse(config.data);
    const users = await mockDb.getUsers();
    
    const newComment = await mockDb.add('comments', {
      post: postId,
      content,
      parentComment: parentComment || null,
      author: users[0],
      likesCount: 0,
      isLiked: false
    });
    
    // Update post comment count
    await mockDb.update('posts', postId, p => ({ ...p, commentCount: p.commentCount + 1 }));
    
    return [201, { success: true, data: { comment: newComment } }];
  });

  // ADMIN
  mock.onGet('/api/v1/admin/dashboard').reply(async () => {
    const users = await mockDb.getUsers();
    const posts = await mockDb.getPosts();
    const reports = await mockDb.get('reports');
    
    return [200, {
      success: true,
      data: {
        stats: {
          totalUsers: users.length,
          totalPosts: posts.length,
          pendingReports: reports.length,
          newUsersToday: 2,
          totalComments: 10,
          totalReactions: 50,
          onlineUsers: users.filter(u => u.isOnline).length
        }
      }
    }];
  });

  mock.onGet('/api/v1/admin/analytics').reply(async () => {
    const analytics = [
      { date: 'Mon', newUsers: 2, newPosts: 5, reactions: 10 },
      { date: 'Tue', newUsers: 5, newPosts: 8, reactions: 20 },
      { date: 'Wed', newUsers: 1, newPosts: 3, reactions: 15 },
      { date: 'Thu', newUsers: 4, newPosts: 12, reactions: 45 },
      { date: 'Fri', newUsers: 8, newPosts: 15, reactions: 60 },
      { date: 'Sat', newUsers: 12, newPosts: 20, reactions: 80 },
      { date: 'Sun', newUsers: 7, newPosts: 10, reactions: 50 },
    ];
    return [200, { success: true, data: { analytics } }];
  });

  // NOTIFICATIONS
  mock.onGet(/\/api\/v1\/notifications/).reply(async () => {
    return [200, { success: true, data: { notifications: [] } }];
  });

  // MESSAGES
  mock.onGet(/\/api\/v1\/messages\/conversations/).reply(async () => {
    return [200, { success: true, data: { conversations: [] } }];
  });

  // STORIES
  mock.onGet(/\/api\/v1\/stories/).reply(async () => {
    return [200, { success: true, data: { stories: [] } }];
  });

  // USERS SUGGESTIONS
  mock.onGet(/\/api\/v1\/users\/me\/suggestions/).reply(async () => {
    const users = await mockDb.getUsers();
    // Return first 5 users except current user as mock suggestions
    return [200, { success: true, data: users.slice(1, 6) }];
  });

  // Pass-through anything else, or mock as needed
  mock.onAny().passThrough();
}
