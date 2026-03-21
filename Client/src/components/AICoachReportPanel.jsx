function AICoachReportPanel({ report, provider, model, generatedAt }) {
  if (!report) {
    return (
      <section className="panel ai-report-panel">
        <div className="panel__head">
          <h2>AI Coach Report</h2>
          <p>Generate your first AI coaching report to view suggestions and projections.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel ai-report-panel">
      <div className="panel__head">
        <h2>AI Coach Report</h2>
        <p>
          Provider: {provider || 'fallback'} • Model: {model || 'heuristic-engine'}
        </p>
      </div>

      <article className="ai-report-callout">
        <h3>Motivation</h3>
        <p>{report.motivation}</p>
      </article>

      <div className="ai-focus-row">
        <article className="ai-focus-card">
          <p>Focus Theme</p>
          <strong>{report.focusTheme || 'Balanced progress execution'}</strong>
        </article>
        <article className="ai-focus-card">
          <p>Generated At</p>
          <strong>{generatedAt ? new Date(generatedAt).toLocaleString() : 'Just now'}</strong>
        </article>
      </div>

      <article className="ai-report-block">
        <h3>Top Suggestions</h3>
        {(report.suggestions || []).length ? (
          <div className="ai-suggestion-list">
            {(report.suggestions || []).map((item, index) => (
              <div key={`${item.title}-${index}`} className="ai-suggestion-item">
                <header>
                  <h4>{item.title}</h4>
                  <span className={`ai-priority ai-priority-${item.priority || 'medium'}`}>
                    {item.priority || 'medium'}
                  </span>
                </header>
                <p>{item.why}</p>
                {(item.actions || []).length ? (
                  <ul>
                    {(item.actions || []).map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No suggestions available.</p>
        )}
      </article>

      <article className="ai-report-block">
        <h3>Weakness Analysis</h3>
        {(report.weaknessAnalysis || []).length ? (
          <div className="ai-weakness-list">
            {(report.weaknessAnalysis || []).map((item, index) => (
              <div key={`${item.area}-${index}`} className="ai-weakness-item">
                <h4>{item.area}</h4>
                <p>
                  <strong>Evidence:</strong> {item.evidence}
                </p>
                <p>
                  <strong>Impact:</strong> {item.impact}
                </p>
                <p>
                  <strong>Recommendation:</strong> {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No weakness analysis available.</p>
        )}
      </article>

      <article className="ai-report-block">
        <h3>Streak Projection</h3>
        <div className="ai-streak-grid">
          <div>
            <p>Current</p>
            <strong>{report.streakProjection?.currentStreak ?? 0}</strong>
          </div>
          <div>
            <p>Likely (7d)</p>
            <strong>{report.streakProjection?.projectedLikely ?? 0}</strong>
          </div>
          <div>
            <p>Best Case (7d)</p>
            <strong>{report.streakProjection?.projectedBestCase ?? 0}</strong>
          </div>
          <div>
            <p>Risk Case (7d)</p>
            <strong>{report.streakProjection?.projectedRiskCase ?? 0}</strong>
          </div>
        </div>
        <p className="ai-streak-rationale">
          {report.streakProjection?.rationale || 'Projection will appear after generation.'}
        </p>
      </article>

      <article className="ai-report-block">
        <h3>7-Day Plan</h3>
        {(report.weeklyPlan || []).length ? (
          <div className="ai-plan-list">
            {(report.weeklyPlan || []).map((item) => (
              <div key={`${item.day}-${item.focus}`} className="ai-plan-item">
                <strong>{item.day}</strong>
                <span>{item.focus}</span>
                <p>{item.task}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">No weekly plan available.</p>
        )}
      </article>

      <article className="ai-report-block">
        <h3>Risk Alerts</h3>
        {(report.riskAlerts || []).length ? (
          <ul className="ai-alert-list">
            {(report.riskAlerts || []).map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        ) : (
          <p className="empty-text">No risk alerts available.</p>
        )}
      </article>
    </section>
  );
}

export default AICoachReportPanel;
