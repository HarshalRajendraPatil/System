const ACHIEVEMENT_CRITERIA_TYPE = {
  XP: 'xp',
  STREAK: 'streak',
  COUNT: 'count',
};

const createBadge = (badgeId, title, description, criteriaType, metricKey, threshold) => ({
  badgeId,
  title,
  description,
  criteriaType,
  metricKey,
  threshold,
});

const xpBadges = [
  [2500, 'XP Vanguard'],
  [5000, 'XP Conqueror'],
  [8000, 'XP Warlord'],
  [12000, 'XP Ascendant'],
  [17000, 'XP Dominion'],
  [23000, 'XP Overclock'],
  [30000, 'XP Grandmaster'],
  [38000, 'XP Mythic'],
  [47000, 'XP Eternal'],
  [60000, 'XP Apex'],
].map(([threshold, title]) =>
  createBadge(
    `xp_${threshold}`,
    title,
    `Reach ${threshold} total XP.`,
    ACHIEVEMENT_CRITERIA_TYPE.XP,
    'total_xp',
    threshold,
  ));

const streakBadges = [
  [14, 'Streak Spark'],
  [21, 'Streak Iron'],
  [30, 'Streak Core'],
  [45, 'Streak Titan'],
  [60, 'Streak Fortress'],
  [90, 'Streak Monolith'],
  [120, 'Streak Immortal'],
  [180, 'Streak Infinity'],
].map(([threshold, title]) =>
  createBadge(
    `streak_${threshold}`,
    title,
    `Maintain a ${threshold}-day streak.`,
    ACHIEVEMENT_CRITERIA_TYPE.STREAK,
    'current_streak',
    threshold,
  ));

const dsaBadges = [
  [80, 'Solver Bronze'],
  [150, 'Solver Silver'],
  [250, 'Solver Gold'],
  [350, 'Solver Platinum'],
  [500, 'Solver Diamond'],
  [700, 'Solver Master'],
  [900, 'Solver Grandmaster'],
  [1200, 'Solver Mythic'],
  [1500, 'Solver Elite'],
  [2000, 'Solver Impossible'],
].map(([threshold, title]) =>
  createBadge(
    `dsa_${threshold}`,
    title,
    `Solve ${threshold} DSA problems.`,
    ACHIEVEMENT_CRITERIA_TYPE.COUNT,
    'dsa_solved_count',
    threshold,
  ));

const mockBadges = [
  [10, 'Mock Initiate'],
  [20, 'Mock Strategist'],
  [35, 'Mock Specialist'],
  [50, 'Mock Veteran'],
  [75, 'Mock Commander'],
  [100, 'Mock Legend'],
].map(([threshold, title]) =>
  createBadge(
    `mock_${threshold}`,
    title,
    `Complete ${threshold} mock interviews.`,
    ACHIEVEMENT_CRITERIA_TYPE.COUNT,
    'mock_count',
    threshold,
  ));

const projectBadges = [
  [5, 'Builder I'],
  [10, 'Builder II'],
  [15, 'Builder III'],
  [20, 'Builder IV'],
  [30, 'Builder V'],
  [40, 'Builder VI'],
].map(([threshold, title]) =>
  createBadge(
    `project_${threshold}`,
    title,
    `Ship ${threshold} projects.`,
    ACHIEVEMENT_CRITERIA_TYPE.COUNT,
    'project_shipped_count',
    threshold,
  ));

const behavioralBadges = [
  [30, 'Storysmith I'],
  [60, 'Storysmith II'],
  [100, 'Storysmith III'],
  [150, 'Storysmith IV'],
  [220, 'Storysmith V'],
].map(([threshold, title]) =>
  createBadge(
    `behavioral_${threshold}`,
    title,
    `Complete ${threshold} behavioral practice sessions.`,
    ACHIEVEMENT_CRITERIA_TYPE.COUNT,
    'behavioral_practice_count',
    threshold,
  ));

const questBadges = [
  [60, 'Consistency I'],
  [120, 'Consistency II'],
  [180, 'Consistency III'],
  [260, 'Consistency IV'],
  [365, 'Consistency V'],
].map(([threshold, title]) =>
  createBadge(
    `quest_${threshold}`,
    title,
    `Complete ${threshold} daily quests.`,
    ACHIEVEMENT_CRITERIA_TYPE.COUNT,
    'quest_completed_count',
    threshold,
  ));

const BADGE_DEFINITIONS = [
  ...xpBadges,
  ...streakBadges,
  ...dsaBadges,
  ...mockBadges,
  ...projectBadges,
  ...behavioralBadges,
  ...questBadges,
];

module.exports = {
  ACHIEVEMENT_CRITERIA_TYPE,
  BADGE_DEFINITIONS,
};
