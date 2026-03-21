const AI_COACH_TYPE = {
  FULL_REPORT: 'full_report',
  MOTIVATION: 'motivation',
};

const AI_COACH_TYPE_ORDER = [
  AI_COACH_TYPE.FULL_REPORT,
  AI_COACH_TYPE.MOTIVATION,
];

const AI_TONE = {
  BALANCED: 'balanced',
  TOUGH_LOVE: 'tough_love',
  SUPPORTIVE: 'supportive',
};

const AI_TONE_ORDER = [
  AI_TONE.BALANCED,
  AI_TONE.TOUGH_LOVE,
  AI_TONE.SUPPORTIVE,
];

const AI_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

const AI_PRIORITY_ORDER = [
  AI_PRIORITY.HIGH,
  AI_PRIORITY.MEDIUM,
  AI_PRIORITY.LOW,
];

module.exports = {
  AI_COACH_TYPE,
  AI_COACH_TYPE_ORDER,
  AI_PRIORITY,
  AI_PRIORITY_ORDER,
  AI_TONE,
  AI_TONE_ORDER,
};
