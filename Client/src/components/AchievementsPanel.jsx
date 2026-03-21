import { useMemo, useState } from 'react';

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
  const [expanded, setExpanded] = useState(false);
  const allBadges = achievements?.allBadges || [];
  const totalBadges = achievements?.totalBadges || 0;
  const earnedCount = achievements?.earnedCount || 0;
  const collapsedCount = 10;
  const visibleBadges = useMemo(
    () => (expanded ? allBadges : allBadges.slice(0, collapsedCount)),
    [allBadges, expanded],
  );

  return (
    <section className="panel achievements-panel">
      <div className="panel__head">
        <h2>Achievements</h2>
        <p>{earnedCount}/{totalBadges} unlocked badges</p>
      </div>

      {allBadges.length ? (
        <>
          <div className={`achievements-grid ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
          {visibleBadges.map((badge) => {
            const highlighted = highlightedBadgeIds.includes(badge.badgeId);
            const badgeClass = badge.unlocked ? 'is-unlocked' : 'is-locked';

            return (
              <article
                key={badge.badgeId}
                className={`achievement-badge ${badgeClass} ${highlighted ? 'unlock-pulse' : ''}`}
              >
                <div className="achievement-badge__type">{badgeTypeLabel(badge.criteriaType)}</div>
                <h3>{badge.title}</h3>
                <p className="achievement-badge__date">
                  {badge.unlocked ? `Unlocked ${formatDate(badge.unlockedAt)}` : 'Locked'}
                </p>

                <div className="achievement-badge__hover">
                  <p><strong>{badge.description}</strong></p>
                  <p>{badge.criteriaLabel}</p>
                  <p>Progress: {badge.currentValue}/{badge.threshold}</p>
                </div>
              </article>
            );
          })}
          </div>
          {allBadges.length > collapsedCount ? (
            <div className="achievements-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? 'Show Less' : `Show All (${allBadges.length})`}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty-text">No badges unlocked yet. Keep logging progress to earn your first badge.</p>
      )}
    </section>
  );
}

export default AchievementsPanel;
