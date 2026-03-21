const STORY_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const STORY_DIFFICULTY_ORDER = [
  STORY_DIFFICULTY.EASY,
  STORY_DIFFICULTY.MEDIUM,
  STORY_DIFFICULTY.HARD,
];

const STORY_OUTCOME = {
  SUCCESS: 'success',
  MIXED: 'mixed',
  LEARNING: 'learning',
};

const STORY_OUTCOME_ORDER = [
  STORY_OUTCOME.SUCCESS,
  STORY_OUTCOME.MIXED,
  STORY_OUTCOME.LEARNING,
];

const PRACTICE_MODE = {
  RANDOM: 'random',
  TARGETED: 'targeted',
  REVIEW: 'review',
};

const PRACTICE_MODE_ORDER = [
  PRACTICE_MODE.RANDOM,
  PRACTICE_MODE.TARGETED,
  PRACTICE_MODE.REVIEW,
];

const CORE_COMPETENCIES = [
  'leadership',
  'ownership',
  'conflict_resolution',
  'communication',
  'decision_making',
  'collaboration',
  'execution',
  'adaptability',
  'customer_focus',
  'mentorship',
];

module.exports = {
  CORE_COMPETENCIES,
  PRACTICE_MODE,
  PRACTICE_MODE_ORDER,
  STORY_DIFFICULTY,
  STORY_DIFFICULTY_ORDER,
  STORY_OUTCOME,
  STORY_OUTCOME_ORDER,
};
