import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_\.]+$/, 'Username can only contain letters, numbers, underscores, and dots'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
    avatarPublicId: String,
    cover: {
      type: String,
      default: '',
    },
    coverPublicId: String,
    bio: {
      type: String,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: '',
    },
    work: {
      type: String,
      maxlength: [100, 'Work cannot exceed 100 characters'],
      default: '',
    },
    education: {
      type: String,
      maxlength: [100, 'Education cannot exceed 100 characters'],
      default: '',
    },
    relationshipStatus: {
      type: String,
      enum: ['Single', 'In a relationship', 'Married', 'It\'s complicated', ''],
      default: '',
    },
    hobbies: [{
      type: String,
      maxlength: [30, 'Each hobby cannot exceed 30 characters'],
    }],
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },

    // Follow system
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Friend system
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Block system
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Account status
    isEmailVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    banExpiresAt: { type: Date, default: null },
    warnings: [
      {
        reason: { type: String, required: true },
        warnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Notification preferences
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      postLikes: { type: Boolean, default: true },
      postComments: { type: Boolean, default: true },
    },

    // Privacy settings
    privacySettings: {
      profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
      postsVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
      friendListVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'friends' },
    },

    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Email verification
    emailVerifyToken: String,
    emailVerifyExpires: Date,

    // Stats (denormalized for performance)
    postsCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    friendsCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ────────────────────────────────────────────────────────
// Indexes (username & email already indexed via unique:true)
// ────────────────────────────────────────────────────────
userSchema.index({ name: 'text', username: 'text', bio: 'text' });
userSchema.index({ createdAt: -1 });

// ────────────────────────────────────────────────────────
// Password Hashing Hook
// ────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ────────────────────────────────────────────────────────
// Instance Methods
// ────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerifyToken;
  delete obj.emailVerifyExpires;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
