function LLDHLDStats({ stats }) {
  if (!stats) return null;

  const completionPercentage = stats.totalDesigns > 0 ? stats.completionRate : 0;

  return (
    <div className="lld-hld-stats">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalDesigns}</div>
          <div className="stat-label">Total Designs</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.completedDesigns}</div>
          <div className="stat-label">Completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{completionPercentage.toFixed(1)}%</div>
          <div className="stat-label">Completion Rate</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="stats-breakdown">
        {Object.keys(stats.byCategory || {}).length > 0 && (
          <div className="breakdown-section">
            <h4>By Category</h4>
            <div className="breakdown-items">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <span key={category} className="breakdown-item">
                  {category}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {Object.keys(stats.byDifficulty || {}).length > 0 && (
          <div className="breakdown-section">
            <h4>By Difficulty</h4>
            <div className="breakdown-items">
              {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
                <span key={difficulty} className="breakdown-item">
                  {difficulty}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {Object.keys(stats.byDesignType || {}).length > 0 && (
          <div className="breakdown-section">
            <h4>By Design Type</h4>
            <div className="breakdown-items">
              {Object.entries(stats.byDesignType).map(([type, count]) => (
                <span key={type} className="breakdown-item">
                  {type}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LLDHLDStats;
