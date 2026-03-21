export const calculateQuestXpPreview = (quest) => {
  let xp = 0;

  if (quest.dsa && quest.lldHld) {
    xp += 40;
  }

  if (quest.projectWork) {
    xp += 25;
  }

  if (quest.theoryRevision) {
    xp += 10;
  }

  if (quest.mockInterview) {
    xp += 50;
  }

  if (quest.behavioralStories) {
    xp += 15;
  }

  if (quest.dsa) {
    if (quest.dsaDifficulty === 'Hard') {
      xp += 25;
    } else if (quest.dsaDifficulty === 'Medium') {
      xp += 15;
    } else {
      xp += 5;
    }
  }

  const hours = Number(quest.hoursLogged) || 0;
  xp += Math.round(hours * 5);

  return Math.max(0, xp);
};

export const formatDateLabel = (dateKey) => {
  if (!dateKey) {
    return 'Today';
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};
