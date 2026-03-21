const QUEST_FIELDS = [
  'dsa',
  'lldHld',
  'projectWork',
  'theoryRevision',
  'mockInterview',
  'behavioralStories',
];

const DSA_DIFFICULTY = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

const DSA_DIFFICULTY_XP = {
  [DSA_DIFFICULTY.EASY]: 5,
  [DSA_DIFFICULTY.MEDIUM]: 15,
  [DSA_DIFFICULTY.HARD]: 25,
};

const BASE_QUEST_XP = {
  DSA_AND_LLD_BONUS: 40,
  PROJECT_WORK: 25,
  THEORY_REVISION: 10,
  MOCK_INTERVIEW: 50,
  BEHAVIORAL_STORIES: 15,
  HOURS_MULTIPLIER: 5,
};

const LEVEL_CAP = 100;

const getLevelThreshold = (level) => {
  if (level <= 1) {
    return 0;
  }

  let threshold = 0;
  for (let currentLevel = 2; currentLevel <= level; currentLevel += 1) {
    threshold += 100 + (currentLevel - 2) * 25;
  }

  return threshold;
};

const resolveLevelFromXp = (totalXp) => {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  let level = 1;

  while (level < LEVEL_CAP && safeXp >= getLevelThreshold(level + 1)) {
    level += 1;
  }

  const currentLevelStartXp = getLevelThreshold(level);
  const nextLevelXp = level === LEVEL_CAP ? currentLevelStartXp : getLevelThreshold(level + 1);
  const xpSpan = Math.max(1, nextLevelXp - currentLevelStartXp);
  const xpInCurrentLevel = Math.max(0, safeXp - currentLevelStartXp);
  const levelProgressPercent =
    level === LEVEL_CAP ? 100 : Math.min(100, Math.round((xpInCurrentLevel / xpSpan) * 100));
  const xpToNextLevel = level === LEVEL_CAP ? 0 : Math.max(0, nextLevelXp - safeXp);

  return {
    level,
    levelCap: LEVEL_CAP,
    currentLevelStartXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpToNextLevel,
    levelProgressPercent,
  };
};

module.exports = {
  BASE_QUEST_XP,
  DSA_DIFFICULTY,
  DSA_DIFFICULTY_XP,
  LEVEL_CAP,
  QUEST_FIELDS,
  getLevelThreshold,
  resolveLevelFromXp,
};
