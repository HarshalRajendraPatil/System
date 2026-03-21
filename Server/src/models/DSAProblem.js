const mongoose = require('mongoose');
const { DSA_DIFFICULTY } = require('../constants/rpg');

const dsaProblemSchema = new mongoose.Schema(
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
    },
    difficulty: {
      type: String,
      enum: Object.values(DSA_DIFFICULTY),
      required: true,
    },
    platform: {
      type: String,
      enum: ['LeetCode', 'Codeforces', 'HackerRank', 'InterviewBit', 'GeeksforGeeks', 'Other'],
      default: 'LeetCode',
    },
    link: {
      type: String,
      validate: {
        validator(value) {
          return !value || /^https?:\/\/.+/.test(value);
        },
        message: 'Link must be a valid URL',
      },
    },
    dateCompletedKey: {
      type: String,
      required: true,
      index: true,
    },
    xpEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

dsaProblemSchema.index({ userId: 1, dateCompletedKey: -1 });
dsaProblemSchema.index({ userId: 1, difficulty: 1 });
dsaProblemSchema.index({ userId: 1, platform: 1 });

module.exports = mongoose.model('DSAProblem', dsaProblemSchema);
