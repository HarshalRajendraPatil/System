const mongoose = require('mongoose');
const {
  SIM_DIFFICULTY_ORDER,
  SIM_ROUND_TYPE_ORDER,
  SIM_STATUS,
  SIM_TOTAL_QUESTIONS,
} = require('../constants/interviewSimulator');

const simulationQuestionSchema = new mongoose.Schema(
  {
    questionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: SIM_TOTAL_QUESTIONS,
    },
    roundType: {
      type: String,
      enum: SIM_ROUND_TYPE_ORDER,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1600,
    },
    answerRichText: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20000,
    },
    answerText: {
      type: String,
      trim: true,
      default: '',
      maxlength: 8000,
    },
    answerCode: {
      type: String,
      trim: true,
      default: '',
      maxlength: 50000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 10,
    },
    gaps: [
      {
        type: String,
        trim: true,
        maxlength: 300,
      },
    ],
    improvedAnswer: {
      type: String,
      trim: true,
      default: '',
      maxlength: 4000,
    },
    weaknesses: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 160,
      },
    ],
  },
  { _id: false },
);

const interviewSimulationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: SIM_DIFFICULTY_ORDER,
      required: true,
      index: true,
    },
    roundType: {
      type: String,
      enum: SIM_ROUND_TYPE_ORDER,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SIM_STATUS),
      default: SIM_STATUS.ACTIVE,
      index: true,
    },
    totalQuestions: {
      type: Number,
      default: SIM_TOTAL_QUESTIONS,
      min: 1,
      max: SIM_TOTAL_QUESTIONS,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: SIM_TOTAL_QUESTIONS,
    },
    questions: [simulationQuestionSchema],
    overallScore10: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
      index: true,
    },
    overallScore100: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    overallSummary: {
      type: String,
      trim: true,
      default: '',
      maxlength: 3000,
    },
    weaknesses: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 160,
      },
    ],
    rewardXpGranted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

interviewSimulationSchema.index({ userId: 1, createdAt: -1 });
interviewSimulationSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewSimulation', interviewSimulationSchema);
