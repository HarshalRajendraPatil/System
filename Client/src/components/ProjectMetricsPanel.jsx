function ProjectMetricsPanel({ metrics, summary }) {
  if (!metrics) {
    return null;
  }

  return (
    <section className="project-metrics panel">
      <div className="panel__head">
        <h2>Project Impact Metrics</h2>
        <p>Quantify your project outcomes and delivery velocity</p>
      </div>

      <div className="project-metrics-grid">
        <article className="project-metric-card">
          <p className="project-metric-label">Total Projects</p>
          <strong className="project-metric-value">{metrics.totalProjects}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">Shipped</p>
          <strong className="project-metric-value">{metrics.throughputShipped}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">Average Impact</p>
          <strong className="project-metric-value">{metrics.averageImpactScore}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">High Impact (70+)</p>
          <strong className="project-metric-value">{metrics.highImpactProjects}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">Revenue Impact</p>
          <strong className="project-metric-value">${metrics.totalRevenueImpact}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">Users Impacted</p>
          <strong className="project-metric-value">{metrics.totalUsersImpacted}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">Time Saved (Hours)</p>
          <strong className="project-metric-value">{metrics.totalTimeSavedHours}</strong>
        </article>

        <article className="project-metric-card">
          <p className="project-metric-label">Avg Cycle Time (Days)</p>
          <strong className="project-metric-value">{metrics.averageCycleTimeDays}</strong>
        </article>
      </div>

      <div className="project-status-summary">
        <h3>Status Breakdown</h3>
        <div className="project-status-summary-grid">
          {Object.entries(metrics.statusBreakdown || {}).map(([status, count]) => (
            <div key={status} className="project-status-pill">
              <span>{status.replace('_', ' ')}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>

      {summary ? (
        <p className="project-summary-inline">
          Board Summary: {summary.totalProjects} projects, {summary.blockedProjects} blocked, average impact {summary.avgImpactScore}
        </p>
      ) : null}
    </section>
  );
}

export default ProjectMetricsPanel;
