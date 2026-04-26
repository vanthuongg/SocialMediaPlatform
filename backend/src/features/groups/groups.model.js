import mongoose from 'mongoose';

// 1. Group Schema
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [2, 'Group name must be at least 2 characters'],
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    avatar: { type: String, default: '' },
    cover: { type: String, default: '' },
    category: { type: String, default: 'General' },
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    visibility: {
      type: String,
      enum: ['visible', 'hidden'],
      default: 'visible',
    },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    tags: [{ type: String, lowercase: true, trim: true }],
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

groupSchema.index({ name: 'text', description: 'text', tags: 'text' });

// 2. GroupMember Schema
const groupMemberSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member',
    },
    isMuted: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

// 3. GroupPost Schema
const groupPostSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      maxlength: [5000, 'Post content cannot exceed 5000 characters'],
      default: '',
    },
    isPinned: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    reactionCounts: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      haha: { type: Number, default: 0 },
      wow: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      angry: { type: Number, default: 0 },
    },
    totalReactions: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

groupPostSchema.index({ group: 1, isApproved: 1, isPinned: -1, createdAt: -1 });

groupPostSchema.virtual('media', {
  ref: 'GroupPostMedia',
  localField: '_id',
  foreignField: 'post',
});

// 4. GroupPostMedia Schema
const groupPostMediaSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupPost',
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    publicId: String,
  },
  { timestamps: true }
);

// 5. GroupRule Schema
const groupRuleSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    detail: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// 6. GroupInvitation Schema
const groupInvitationSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

groupInvitationSchema.index({ group: 1, invitee: 1 }, { unique: true });

// 7. GroupJoinRequest Schema
const groupJoinRequestSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [
      {
        question: String,
        answer: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

groupJoinRequestSchema.index({ group: 1, user: 1 }, { unique: true });

// 8. GroupNotification Schema
const groupNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'join_request',
        'join_approved',
        'new_post',
        'post_pending',
        'invitation',
        'role_changed',
        'post_rejected',
      ],
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    referenceId: mongoose.Schema.Types.ObjectId,
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 9. GroupReport Schema
const groupReportSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'member'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ['pending', 'resolved', 'ignored'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// 10. GroupSettings Schema
const groupSettingsSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      unique: true,
      index: true,
    },
    postModeration: { type: Boolean, default: false },
    membershipApprovalRequired: { type: Boolean, default: false },
    joinQuestions: [{ type: String }],
  },
  { timestamps: true }
);

export const Group = mongoose.model('Group', groupSchema);
export const GroupMember = mongoose.model('GroupMember', groupMemberSchema);
export const GroupPost = mongoose.model('GroupPost', groupPostSchema);
export const GroupPostMedia = mongoose.model('GroupPostMedia', groupPostMediaSchema);
export const GroupRule = mongoose.model('GroupRule', groupRuleSchema);
export const GroupInvitation = mongoose.model('GroupInvitation', groupInvitationSchema);
export const GroupJoinRequest = mongoose.model('GroupJoinRequest', groupJoinRequestSchema);
export const GroupNotification = mongoose.model('GroupNotification', groupNotificationSchema);
export const GroupReport = mongoose.model('GroupReport', groupReportSchema);
export const GroupSettings = mongoose.model('GroupSettings', groupSettingsSchema);
