const mongoose = require('mongoose');
const {
  PRACTICE_MODE,
  PRACTICE_MODE_ORDER,
  STORY_DIFFICULTY,
  STORY_DIFFICULTY_ORDER,
  STORY_OUTCOME,
  STORY_OUTCOME_ORDER,
} = require('../constants/behavioral');

const practiceLogSchema = new mongoose.Schema(
  {
    practicedAt: {
      type: Date,
      default: Date.now,
    },
    mode: {
      type: String,
      enum: PRACTICE_MODE_ORDER,
      default: PRACTICE_MODE.REVIEW,
    },
    selfScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1200,
    },
  },
  { _id: false },
);

const behavioralStorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
      maxlength: 180,
    },
    questionPrompt: {
      type: String,
      trim: true,
      required: true,
      maxlength: 600,
    },
    companyContext: {
      type: String,
      trim: true,
      default: '',
      maxlength: 140,
    },
    roleContext: {
      type: String,
      trim: true,
      default: '',
      maxlength: 140,
    },
    story: {
      situation: {
        type: String,
        trim: true,
        required: true,
        maxlength: 2000,
      },
      task: {
        type: String,
        trim: true,
        required: true,
        maxlength: 1500,
      },
      action: {
        type: String,
        trim: true,
        required: true,
        maxlength: 3000,
      },
      result: {
        type: String,
        trim: true,
        required: true,
        maxlength: 2000,
      },
    },
    competencies: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    quantifiedImpact: {
      type: String,
      trim: true,
      default: '',
      maxlength: 800,
    },
    reflectionNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 3000,
    },
    difficulty: {
      type: String,
      enum: STORY_DIFFICULTY_ORDER,
      default: STORY_DIFFICULTY.MEDIUM,
      index: true,
    },
    outcome: {
      type: String,
      enum: STORY_OUTCOME_ORDER,
      default: STORY_OUTCOME.LEARNING,
      index: true,
    },
    confidenceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    practiceCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    lastPracticedAt: {
      type: Date,
      default: null,
      index: true,
    },
    practiceLogs: [practiceLogSchema],
  },
  {
    timestamps: true,
  },
);

behavioralStorySchema.index({ userId: 1, updatedAt: -1 });
behavioralStorySchema.index({ userId: 1, competencies: 1, difficulty: 1 });
behavioralStorySchema.index({ userId: 1, tags: 1 });
behavioralStorySchema.index({
  title: 'text',
  questionPrompt: 'text',
  'story.situation': 'text',
  'story.task': 'text',
  'story.action': 'text',
  'story.result': 'text',
  competencies: 'text',
  tags: 'text',
  reflectionNotes: 'text',
});

module.exports = mongoose.model('BehavioralStory', behavioralStorySchema);
