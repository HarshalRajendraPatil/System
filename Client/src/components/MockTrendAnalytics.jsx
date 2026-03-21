const scoreBarWidth = (score, max = 100) => `${Math.max(0, Math.min(100, (score / max) * 100))}%`;

function MockTrendAnalytics({ trends }) {
  if (!trends) {
    return null;
  }

  return (
    <section className="panel mock-trend-panel">
      <div className="panel__head">
        <h2>Trend Analytics</h2>
        <p>Score evolution, recurring weaknesses, and section-level performance</p>
      </div>

      <div className="mock-trend-summary-grid">
        <article className="mock-trend-card">
          <p>Total Mocks</p>
          <strong>{trends.totalMocks}</strong>
        </article>
        <article className="mock-trend-card">
          <p>Average Score</p>
          <strong>{trends.summary?.averageScore || 0}</strong>
        </article>
        <article className="mock-trend-card">
          <p>Best Score</p>
          <strong>{trends.summary?.bestScore || 0}</strong>
        </article>
        <article className="mock-trend-card">
          <p>Score Delta</p>
          <strong>{trends.summary?.scoreDelta || 0}</strong>
        </article>
        <article className="mock-trend-card">
          <p>Latest Score</p>
          <strong>{trends.summary?.latestScore || 0}</strong>
        </article>
        <article className="mock-trend-card">
          <p>Confidence Delta</p>
          <strong>{trends.summary?.confidenceDelta || 0}</strong>
        </article>
      </div>

      <div className="mock-trend-layout">
        <article className="mock-trend-block">
          <h3>Daily Score Trend</h3>
          <div className="mock-series-list">
            {(trends.scoreTrend || []).slice(-14).map((point) => (
              <div key={point.dateKey} className="mock-series-row">
                <span>{point.dateKey}</span>
                <div className="mock-series-bar-wrap">
                  <div className="mock-series-bar" style={{ width: scoreBarWidth(point.avgScore) }} />
                </div>
                <strong>{point.avgScore}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="mock-trend-block">
          <h3>Weakness Frequency</h3>
          {(trends.weaknessDistribution || []).length ? (
            <div className="mock-series-list">
              {trends.weaknessDistribution.map((item) => (
                <div key={item.weakness} className="mock-series-row">
                  <span>{item.weakness}</span>
                  <div className="mock-series-bar-wrap">
                    <div className="mock-series-bar weakness" style={{ width: scoreBarWidth(item.count, Math.max(...trends.weaknessDistribution.map((i) => i.count), 1)) }} />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No weakness data yet.</p>
          )}
        </article>
      </div>

      <article className="mock-trend-block">
        <h3>Section Averages</h3>
        <div className="mock-series-list">
          {Object.entries(trends.sectionAverages || {}).map(([section, value]) => (
            <div key={section} className="mock-series-row">
              <span>{section}</span>
              <div className="mock-series-bar-wrap">
                <div className="mock-series-bar section" style={{ width: scoreBarWidth(value) }} />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default MockTrendAnalytics;
