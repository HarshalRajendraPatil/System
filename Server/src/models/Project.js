const mongoose = require('mongoose');
const {
  PROJECT_PRIORITY_ORDER,
  PROJECT_STATUS,
  PROJECT_STATUS_ORDER,
} = require('../constants/projects');

const projectMovementSchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: PROJECT_STATUS_ORDER,
      required: true,
    },
    toStatus: {
      type: String,
      enum: PROJECT_STATUS_ORDER,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    movedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
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
      maxlength: 180,
    },
    summary: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: PROJECT_STATUS_ORDER,
      default: PROJECT_STATUS.IDEA,
      index: true,
    },
    priority: {
      type: String,
      enum: PROJECT_PRIORITY_ORDER,
      default: 'medium',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    techStack: [
      {
        type: String,
        trim: true,
      },
    ],
    repositoryUrl: {
      type: String,
      trim: true,
      default: '',
    },
    demoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    impact: {
      usersImpacted: { type: Number, default: 0, min: 0 },
      revenueImpact: { type: Number, default: 0, min: 0 },
      performanceGainPercent: { type: Number, default: 0, min: 0, max: 1000 },
      timeSavedHours: { type: Number, default: 0, min: 0 },
      qualityScore: { type: Number, default: 0, min: 0, max: 100 },
      adoptionRatePercent: { type: Number, default: 0, min: 0, max: 100 },
      confidence: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
    },
    impactScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    kanbanPosition: {
      type: Number,
      default: 0,
      index: true,
    },
    movementHistory: [projectMovementSchema],
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ userId: 1, status: 1, kanbanPosition: 1 });
projectSchema.index({ userId: 1, impactScore: -1 });
projectSchema.index({ title: 'text', summary: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Project', projectSchema);
