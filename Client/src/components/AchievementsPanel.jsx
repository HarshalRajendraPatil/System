function formatDate(value) {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '';
  }
}

function badgeTypeLabel(criteriaType) {
  if (criteriaType === 'xp') {
    return 'XP';
  }

  if (criteriaType === 'streak') {
    return 'Streak';
  }

  return 'Count';
}

function AchievementsPanel({ achievements, highlightedBadgeIds = [] }) {
  const earnedBadges = achievements?.earnedBadges || [];
  const totalBadges = achievements?.totalBadges || 0;
  const earnedCount = achievements?.earnedCount || 0;

  return (
    <section className="panel achievements-panel">
      <div className="panel__head">
        <h2>Achievements</h2>
        <p>{earnedCount}/{totalBadges} unlocked badges</p>
      </div>

      {earnedBadges.length ? (
        <div className="achievements-grid">
          {earnedBadges.map((badge) => {
            const highlighted = highlightedBadgeIds.includes(badge.badgeId);

            return (
              <article
                key={badge.badgeId}
                className={`achievement-badge ${highlighted ? 'unlock-pulse' : ''}`}
              >
                <div className="achievement-badge__type">{badgeTypeLabel(badge.criteriaType)}</div>
                <h3>{badge.title}</h3>
                <p className="achievement-badge__date">Unlocked {formatDate(badge.unlockedAt)}</p>

                <div className="achievement-badge__hover">
                  <p><strong>{badge.description}</strong></p>
                  <p>{badge.criteriaLabel}</p>
                  <p>Progress: {badge.currentValue}/{badge.threshold}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-text">No badges unlocked yet. Keep logging progress to earn your first badge.</p>
      )}
    </section>
  );
}

export default AchievementsPanel;
