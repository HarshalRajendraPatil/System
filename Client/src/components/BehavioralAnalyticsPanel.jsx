function BehavioralAnalyticsPanel({ analytics }) {
  if (!analytics) {
    return null;
  }

  return (
    <section className="panel behavioral-analytics-panel">
      <div className="panel__head">
        <h2>Behavioral Analytics</h2>
        <p>Coverage depth, practice consistency, and confidence signals</p>
      </div>

      <div className="behavioral-metric-grid">
        <article className="behavioral-metric-card">
          <p>Total Stories</p>
          <strong>{analytics.totals?.totalStories || 0}</strong>
        </article>
        <article className="behavioral-metric-card">
          <p>Practice Sessions</p>
          <strong>{analytics.totals?.totalPracticeSessions || 0}</strong>
        </article>
        <article className="behavioral-metric-card">
          <p>Average Confidence</p>
          <strong>{analytics.totals?.averageConfidence || 0}</strong>
        </article>
        <article className="behavioral-metric-card">
          <p>Average Practice Score</p>
          <strong>{analytics.totals?.averagePracticeScore || 0}</strong>
        </article>
        <article className="behavioral-metric-card">
          <p>Favorites</p>
          <strong>{analytics.totals?.favoriteStories || 0}</strong>
        </article>
        <article className="behavioral-metric-card">
          <p>Recent Sessions (14d)</p>
          <strong>{analytics.recentPracticeSessions || 0}</strong>
        </article>
      </div>

      <div className="behavioral-analytics-layout">
        <article className="behavioral-analytics-block">
          <h3>Top Competencies</h3>
          {(analytics.topCompetencies || []).length ? (
            <ul className="behavioral-simple-list">
              {(analytics.topCompetencies || []).map((item) => (
                <li key={item.competency}>
                  <span>{item.competency}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">No competency data yet.</p>
          )}
        </article>

        <article className="behavioral-analytics-block">
          <h3>Missing Core Competencies</h3>
          {(analytics.missingCoreCompetencies || []).length ? (
            <div className="behavioral-chip-cloud">
              {(analytics.missingCoreCompetencies || []).map((competency) => (
                <span key={competency} className="behavioral-chip missing">
                  {competency}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-text">Core competency coverage is complete.</p>
          )}
        </article>
      </div>

      <article className="behavioral-analytics-block">
        <h3>Least Practiced Stories</h3>
        {(analytics.leastPracticed || []).length ? (
          <ul className="behavioral-simple-list">
            {(analytics.leastPracticed || []).map((item) => (
              <li key={item._id}>
                <span>{item.title}</span>
                <strong>{item.practiceCount} sessions</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-text">No stories to review yet.</p>
        )}
      </article>
    </section>
  );
}

export default BehavioralAnalyticsPanel;
