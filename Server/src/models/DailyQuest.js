const mongoose = require('mongoose');
const { DSA_DIFFICULTY } = require('../constants/rpg');

const dailyQuestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
    },
    dsa: {
      type: Boolean,
      default: false,
    },
    lldHld: {
      type: Boolean,
      default: false,
    },
    projectWork: {
      type: Boolean,
      default: false,
    },
    theoryRevision: {
      type: Boolean,
      default: false,
    },
    mockInterview: {
      type: Boolean,
      default: false,
    },
    behavioralStories: {
      type: Boolean,
      default: false,
    },
    dsaDifficulty: {
      type: String,
      enum: Object.values(DSA_DIFFICULTY),
      default: DSA_DIFFICULTY.EASY,
    },
    hoursLogged: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
    },
    xpEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

dailyQuestSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
dailyQuestSchema.index({ userId: 1, dateKey: -1 });

module.exports = mongoose.model('DailyQuest', dailyQuestSchema);
