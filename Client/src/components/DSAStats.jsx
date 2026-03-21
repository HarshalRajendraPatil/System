function DSAStats({ stats, isLoading }) {
  if (isLoading) {
    return <p className="loading">Calculating DSA stats...</p>;
  }

  if (!stats) {
    return null;
  }

  const difficultyPercentages = {
    easy:
      stats.totalProblems > 0
        ? Math.round((stats.easyCount / stats.totalProblems) * 100)
        : 0,
    medium:
      stats.totalProblems > 0
        ? Math.round((stats.mediumCount / stats.totalProblems) * 100)
        : 0,
    hard:
      stats.totalProblems > 0
        ? Math.round((stats.hardCount / stats.totalProblems) * 100)
        : 0,
  };

  return (
    <div className="dsa-stats">
      <article className="stat-box">
        <p className="stat-label">Total Problems</p>
        <p className="stat-value">{stats.totalProblems}</p>
      </article>

      <article className="stat-box">
        <p className="stat-label">Easy</p>
        <p className="stat-value">{stats.easyCount}</p>
        <p className="stat-meta">{difficultyPercentages.easy}% • {stats.easyXp} XP</p>
      </article>

      <article className="stat-box">
        <p className="stat-label">Medium</p>
        <p className="stat-value">{stats.mediumCount}</p>
        <p className="stat-meta">{difficultyPercentages.medium}% • {stats.mediumXp} XP</p>
      </article>

      <article className="stat-box">
        <p className="stat-label">Hard</p>
        <p className="stat-value">{stats.hardCount}</p>
        <p className="stat-meta">{difficultyPercentages.hard}% • {stats.hardXp} XP</p>
      </article>

      <article className="stat-box">
        <p className="stat-label">Total DSA XP</p>
        <p className="stat-value">{stats.totalXpFromDSA}</p>
        <p className="stat-meta">From all solved problems</p>
      </article>

      {Object.keys(stats.platformBreakdown).length > 0 ? (
        <article className="stat-box platform-breakdown">
          <p className="stat-label">Platform Breakdown</p>
          <div className="platform-list">
            {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
              <span key={platform} className="platform-item">
                {platform}: {count}
              </span>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}

export default DSAStats;
