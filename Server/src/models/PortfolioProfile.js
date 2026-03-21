const mongoose = require('mongoose');
const { PORTFOLIO_THEME_ORDER, PORTFOLIO_THEME } = require('../constants/portfolio');

const portfolioProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProfile',
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    publicEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
      default: '',
      maxlength: 180,
    },
    summary: {
      type: String,
      trim: true,
      default: '',
      maxlength: 900,
    },
    themePreference: {
      type: String,
      enum: PORTFOLIO_THEME_ORDER,
      default: PORTFOLIO_THEME.DARK,
    },
    accentColor: {
      type: String,
      trim: true,
      default: '#00bcd4',
      maxlength: 24,
    },
    sections: {
      showDSA: { type: Boolean, default: true },
      showProjects: { type: Boolean, default: true },
      showMocks: { type: Boolean, default: true },
      showBehavioral: { type: Boolean, default: true },
      showAI: { type: Boolean, default: true },
    },
    contactLinks: {
      github: { type: String, trim: true, default: '', maxlength: 300 },
      linkedin: { type: String, trim: true, default: '', maxlength: 300 },
      website: { type: String, trim: true, default: '', maxlength: 300 },
    },
    totalPublicViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPublishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

portfolioProfileSchema.index({ publicEnabled: 1, slug: 1 });

module.exports = mongoose.model('PortfolioProfile', portfolioProfileSchema);