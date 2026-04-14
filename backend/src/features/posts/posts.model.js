import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: String,
  type: { type: String, enum: ['image', 'video'], required: true },
  width: Number,
  height: Number,
  duration: Number, // For videos, in seconds
});

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      maxlength: [5000, 'Post content cannot exceed 5000 characters'],
      default: '',
    },
    media: [mediaSchema],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    hashtags: [{ type: String, lowercase: true, trim: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sharedModel',
    },
    sharedModel: {
      type: String,
      enum: ['Post', 'Reel', 'GroupPost'],
      default: 'Post',
    },
    shareCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    // Reaction counts (denormalized for performance)
    reactionCounts: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      haha: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 },
    },
    totalReactions: { type: Number, default: 0 },

    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ content: 'text', hashtags: 'text' });
postSchema.index({ isDeleted: 1, visibility: 1, createdAt: -1 });

// Soft-delete filter — never return deleted posts by default
postSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const Post = mongoose.model('Post', postSchema);
export default Post;
