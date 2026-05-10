import localforage from 'localforage';

// Configure localforage
localforage.config({
  driver: localforage.INDEXEDDB, 
  name: 'nova_db',
  version: 1.0,
  storeName: 'nova_store',
  description: 'Nova offline database'
});

export const mockDb = {
  async get(key) {
    const data = await localforage.getItem(key);
    return data || [];
  },
  async set(key, value) {
    await localforage.setItem(key, value);
  },
  async getById(key, id) {
    const items = await this.get(key);
    return items.find((i) => i._id === id);
  },
  async update(key, id, updateFn) {
    const items = await this.get(key);
    const index = items.findIndex((i) => i._id === id);
    if (index !== -1) {
      items[index] = updateFn(items[index]);
      await this.set(key, items);
      return items[index];
    }
    return null;
  },
  async add(key, item) {
    const items = await this.get(key);
    const newItem = { ...item, _id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    items.unshift(newItem); // Add to beginning
    await this.set(key, items);
    return newItem;
  },
  async remove(key, id) {
    const items = await this.get(key);
    const newItems = items.filter((i) => i._id !== id);
    await this.set(key, newItems);
  },

  async getUsers() { return this.get('users'); },
  async getPosts() { return this.get('posts'); },
  async getComments() { return this.get('comments'); },
  
  async getPostById(postId) {
    const posts = await this.getPosts();
    return posts.find((p) => p._id === postId);
  },
  
  async getCommentsByPostId(postId) {
    const allComments = await this.get('comments');
    const rootComments = allComments.filter(c => c.post === postId && !c.parentComment);
    
    // Attach replies
    const buildTree = (comments, all) => {
      return comments.map(c => {
        const replies = all.filter(r => r.parentComment === c._id);
        return {
          ...c,
          replies: buildTree(replies, all)
        };
      });
    };
    
    return buildTree(rootComments, allComments);
  }
};
