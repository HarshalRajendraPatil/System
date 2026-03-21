const mongoose = require('mongoose');
const { ACHIEVEMENT_CRITERIA_TYPE } = require('../constants/achievements');

const userBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    badgeId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 400,
    },
    criteriaType: {
      type: String,
      enum: Object.values(ACHIEVEMENT_CRITERIA_TYPE),
      required: true,
      index: true,
    },
    metricKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    progressValueAtUnlock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', userBadgeSchema);
