const mongoose = require('mongoose');

const lldHldDesignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    designType: {
      type: String,
      enum: ['LLD', 'HLD', 'Both'],
      default: 'Both',
      required: true,
    },
    content: {
      type: String,
      required: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      enum: ['System Design', 'Database Design', 'API Design', 'Architecture', 'Other'],
      default: 'Other',
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    resources: [
      {
        title: String,
        url: String,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for search queries
lldHldDesignSchema.index({ title: 'text', content: 'text', description: 'text' });
lldHldDesignSchema.index({ userId: 1, isCompleted: 1 });
lldHldDesignSchema.index({ category: 1, designType: 1 });

module.exports = mongoose.model('LLDHLDDesign', lldHldDesignSchema);
