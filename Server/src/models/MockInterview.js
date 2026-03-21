const mongoose = require('mongoose');
const {
  INTERVIEWER_TYPE_ORDER,
  MOCK_FORMAT_ORDER,
  MOCK_SECTION_KEYS,
} = require('../constants/mocks');

const sectionScoresShape = MOCK_SECTION_KEYS.reduce((shape, key) => {
  shape[key] = {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  };

  return shape;
}, {});

const mockInterviewSchema = new mongoose.Schema(
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
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    format: {
      type: String,
      enum: MOCK_FORMAT_ORDER,
      default: 'mixed',
      index: true,
    },
    interviewerType: {
      type: String,
      enum: INTERVIEWER_TYPE_ORDER,
      default: 'self',
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    sectionScores: sectionScoresShape,
    confidenceBefore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    confidenceAfter: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 600,
    },
    strengths: [
      {
        type: String,
        trim: true,
      },
    ],
    weaknesses: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    actionItems: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 4000,
    },
  },
  {
    timestamps: true,
  },
);

mockInterviewSchema.index({ userId: 1, dateKey: 1 });
mockInterviewSchema.index({ userId: 1, weaknesses: 1 });
mockInterviewSchema.index({ userId: 1, format: 1, interviewerType: 1 });
mockInterviewSchema.index({ title: 'text', notes: 'text', weaknesses: 'text', strengths: 'text' });

module.exports = mongoose.model('MockInterview', mockInterviewSchema);
