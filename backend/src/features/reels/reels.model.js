import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    video: {
      url: { type: String, required: true },
      publicId: String,
      duration: Number,
      thumbnail: String,
    },
    caption: {
      type: String,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: '',
    },
    hashtags: [{ type: String, lowercase: true }],
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    audio: {
      name: String,
      artist: String,
    },
    reactionCounts: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
    },
    totalReactions: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    visibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ createdAt: -1, visibility: 1 });
reelSchema.index({ hashtags: 1 });

const Reel = mongoose.model('Reel', reelSchema);
export default Reel;
