const mongoose = require('mongoose');
const { AI_COACH_TYPE, AI_COACH_TYPE_ORDER, AI_TONE_ORDER } = require('../constants/ai');

const aiCoachInsightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: AI_COACH_TYPE_ORDER,
      default: AI_COACH_TYPE.FULL_REPORT,
      index: true,
    },
    focusArea: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    tone: {
      type: String,
      enum: AI_TONE_ORDER,
      default: 'balanced',
    },
    customPrompt: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    provider: {
      type: String,
      enum: ['grok', 'fallback'],
      default: 'fallback',
      index: true,
    },
    model: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },
    latencyMs: {
      type: Number,
      default: 0,
      min: 0,
    },
    usage: {
      promptTokens: { type: Number, default: 0, min: 0 },
      completionTokens: { type: Number, default: 0, min: 0 },
      totalTokens: { type: Number, default: 0, min: 0 },
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    insight: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

aiCoachInsightSchema.index({ userId: 1, createdAt: -1 });
aiCoachInsightSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('AICoachInsight', aiCoachInsightSchema);
