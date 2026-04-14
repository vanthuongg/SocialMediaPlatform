import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
    targetModel: { type: String, enum: ['Post', 'User', 'Comment', 'Reel'], required: true },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'misinformation', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    actionTaken: String,
  },
  { timestamps: true }
);

reportSchema.index({ reporter: 1, target: 1, targetModel: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
