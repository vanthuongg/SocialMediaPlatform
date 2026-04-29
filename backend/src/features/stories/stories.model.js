import mongoose from 'mongoose';

const storyCommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 300 },
  },
  { timestamps: true }
);

const storyReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }, // e.g. '❤️', '😂', '😮', '😢', '😡', '👍'
});

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    media: {
      url: { type: String, required: true },
      publicId: String,
      type: { type: String, enum: ['image', 'video'], required: true },
      duration: Number,
    },
    caption: { type: String, maxlength: 500 },
    backgroundColor: { type: String, default: '#7C3AED' },
    textContent: String, // For text-only stories
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    viewCount: { type: Number, default: 0 },
    reactions: [storyReactionSchema],
    comments: [storyCommentSchema],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes expired stories
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, expiresAt: 1 });

const Story = mongoose.model('Story', storySchema);
export default Story;
