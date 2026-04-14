import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetModel',
    },
    targetModel: {
      type: String,
      enum: ['Post', 'Comment', 'Reel', 'GroupPost'],
      required: true,
    },
  },
  { timestamps: true }
);

// A user can only react once per target
reactionSchema.index({ user: 1, target: 1, targetModel: 1 }, { unique: true });
reactionSchema.index({ target: 1, targetModel: 1 });

const Reaction = mongoose.model('Reaction', reactionSchema);
export default Reaction;
