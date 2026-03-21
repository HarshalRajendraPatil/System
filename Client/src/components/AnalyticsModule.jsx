import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getDSAAnalytics,
  getLeetCodeSettings,
  syncLeetCodeSubmissions,
  updateLeetCodeSettings,
} from '../api/dsaApi';

const toDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HEAT_COLORS = {
  0: 'rgba(99, 115, 129, 0.2)',
  1: 'rgba(0, 188, 212, 0.24)',
  2: 'rgba(0, 188, 212, 0.45)',
  3: 'rgba(255, 152, 0, 0.62)',
  4: 'rgba(255, 111, 0, 0.88)',
};

const PIE_COLORS = {
  Easy: '#00bcd4',
  Medium: '#ff9800',
  Hard: '#ff3d00',
};

function AnalyticsModule() {
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const progressData = analytics?.progressSeries || analytics?.xpGrowth || [];
  const progressLabel = analytics?.progressLabel || 'Cumulative XP';
  const contestSeries = analytics?.contestRatingSeries || [];

  const loadAll = async () => {
    setLoading(true);
    setError('');

    try {
      const [settingsData, analyticsData] = await Promise.all([
        getLeetCodeSettings(),
        getDSAAnalytics(),
      ]);

      setUsername(settingsData?.username || '');
      setSavedUsername(settingsData?.username || '');
      setAnalytics(analyticsData || null);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onSync = async () => {
    setSyncing(true);
    setError('');
    setStatus('');

    try {
      const nextUsername = String(username || '').trim();
      if (!nextUsername) {
        throw new Error('Please enter a LeetCode username before syncing.');
      }

      if (nextUsername !== savedUsername) {
        const settings = await updateLeetCodeSettings({ username: nextUsername });
        setSavedUsername(settings?.username || nextUsername);
      }

      const result = await syncLeetCodeSubmissions();
      const analyticsData = await getDSAAnalytics();
      setAnalytics(analyticsData || null);

      setStatus(`Sync complete: imported ${result.importedCount}/${result.fetchedCount} submissions.`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to sync LeetCode submissions.');
    } finally {
      setSyncing(false);
    }
  };

  const heatmapCalendar = useMemo(() => {
    const countMap = new Map((analytics?.heatmap || []).map((item) => [item.dateKey, item]));
    const today = new Date();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (53 * 7 - 1));
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());

    const weeks = [];
    const monthLabels = [];
    let previousMonth = null;

    for (let weekIndex = 0; weekIndex < 53; weekIndex += 1) {
      const weekStart = new Date(start);
      weekStart.setUTCDate(start.getUTCDate() + weekIndex * 7);

      const month = weekStart.getUTCMonth();
      if (month !== previousMonth) {
        monthLabels.push({
          weekIndex,
          label: weekStart.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        });
        previousMonth = month;
      }

      const days = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const current = new Date(weekStart);
        current.setUTCDate(weekStart.getUTCDate() + dayIndex);

        const dateKey = toDateKey(current);
        const bucket = countMap.get(dateKey);
        days.push({
          dateKey,
          count: bucket?.count || 0,
          level: bucket?.level || 0,
          isFuture: current > end,
        });
      }

      weeks.push(days);
    }

    return { weeks, monthLabels };
  }, [analytics]);

  if (loading) {
    return <p className="loading">Loading analytics...</p>;
  }

  return (
    <section className="analytics-module">
      <section className="panel analytics-settings">
        <div className="panel__head">
          <h2>LeetCode Integration</h2>
          <p>Sync your last 50 accepted submissions into DSA logs with XP rewards.</p>
        </div>

        <div className="analytics-settings-row">
          <label className="field analytics-field-grow">
            <span>LeetCode Username</span>
            <input
              type="text"
              placeholder="your-handle"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="button"
            onClick={onSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {status ? <p className="status-banner">{status}</p> : null}
      </section>

      <section className="panel analytics-overview">
        <div className="panel__head">
          <h3>LeetCode Snapshot</h3>
          <p>Live totals fetched from leetscan</p>
        </div>

        {analytics?.leetCodeSnapshot ? (
          <>
            <div className="analytics-snapshot-grid">
              <div className="analytics-snapshot-item">
                <span>Total Solved</span>
                <strong>{analytics.leetCodeSnapshot.totalSolved || 0}</strong>
              </div>
              <div className="analytics-snapshot-item">
                <span>Easy</span>
                <strong>{analytics.leetCodeSnapshot.easySolved || 0}</strong>
              </div>
              <div className="analytics-snapshot-item">
                <span>Medium</span>
                <strong>{analytics.leetCodeSnapshot.mediumSolved || 0}</strong>
              </div>
              <div className="analytics-snapshot-item">
                <span>Hard</span>
                <strong>{analytics.leetCodeSnapshot.hardSolved || 0}</strong>
              </div>
              <div className="analytics-snapshot-item">
                <span>Ranking</span>
                <strong>{analytics.leetCodeSnapshot.ranking || 0}</strong>
              </div>
              <div className="analytics-snapshot-item">
                <span>Reputation</span>
                <strong>{analytics.leetCodeSnapshot.reputation || 0}</strong>
              </div>
            </div>

            {(analytics.leetCodeSnapshot.recentSubmissions || []).length ? (
              <div className="analytics-recent-list">
                {(analytics.leetCodeSnapshot.recentSubmissions || []).slice(0, 5).map((item) => (
                  <a key={`${item.titleSlug}-${item.timestamp}`} href={item.link} target="_blank" rel="noreferrer">
                    <span>{item.title}</span>
                    <small>{item.timestamp ? new Date(Number(item.timestamp) * 1000).toLocaleDateString() : ''}</small>
                  </a>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="empty-text">No live LeetCode snapshot yet. Add username and run sync.</p>
        )}
      </section>

      <section className="panel analytics-overview">
        <div className="panel__head">
          <h3>Heatmap Calendar</h3>
          <p>LeetCode-style yearly activity grid</p>
        </div>

        <div className="analytics-heatmap-shell">
          <div className="analytics-heatmap-month-row">
            {(heatmapCalendar.monthLabels || []).map((month) => (
              <span key={`${month.label}-${month.weekIndex}`} style={{ gridColumn: `${month.weekIndex + 1} / span 1` }}>
                {month.label}
              </span>
            ))}
          </div>

          <div className="analytics-heatmap-body">
            <div className="analytics-heatmap-day-labels">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="analytics-heatmap-weeks">
              {(heatmapCalendar.weeks || []).map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="analytics-heatmap-week-col">
                  {week.map((cell) => (
                    <span
                      key={cell.dateKey}
                      className={`analytics-heatmap-cell ${cell.isFuture ? 'is-future' : ''}`}
                      title={`${cell.dateKey}: ${cell.count} solves`}
                      style={{ background: HEAT_COLORS[cell.level] || HEAT_COLORS[0] }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-charts-grid">
        <article className="panel">
          <div className="panel__head">
            <h3>Solves By Difficulty</h3>
            <p>Total: {analytics?.totalProblems || 0}</p>
          </div>

          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={analytics?.byDifficulty || []} dataKey="count" nameKey="difficulty" outerRadius={100}>
                  {(analytics?.byDifficulty || []).map((item) => (
                    <Cell key={`pie-${item.difficulty}`} fill={PIE_COLORS[item.difficulty] || '#00bcd4'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel__head">
            <h3>Contest Rating Trend</h3>
            <p>Rating movement across attended contests</p>
          </div>

          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={contestSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateKey" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="rating" stroke="#ff9800" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel__head">
            <h3>Contest Global Rank</h3>
            <p>Lower is better</p>
          </div>

          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={contestSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateKey" hide={false} />
                <YAxis allowDecimals={false} reversed />
                <Tooltip />
                <Bar dataKey="ranking" fill="#26a69a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel__head">
            <h3>Solves By Week</h3>
            <p>Weekly consistency trend</p>
          </div>

          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics?.byWeek || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekStart" hide={false} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="solves" fill="#00bcd4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel analytics-chart-full">
          <div className="panel__head">
            <h3>{progressLabel}</h3>
            <p>
              {progressLabel === 'Cumulative Solves'
                ? 'Derived from LeetCode submission timeline'
                : 'Cumulative XP from DSA solves'}
            </p>
          </div>

          <div className="analytics-chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateKey" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#ff6f00" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {analytics?.leetCodeSnapshot?.contestRanking ? (
        <section className="panel analytics-overview">
          <div className="panel__head">
            <h3>Contest Details</h3>
            <p>Competitive profile snapshot</p>
          </div>

          <div className="analytics-snapshot-grid">
            <div className="analytics-snapshot-item">
              <span>Contest Rating</span>
              <strong>{analytics.leetCodeSnapshot.contestRanking.rating || 0}</strong>
            </div>
            <div className="analytics-snapshot-item">
              <span>Contests Attended</span>
              <strong>{analytics.leetCodeSnapshot.contestRanking.attendedContestsCount || 0}</strong>
            </div>
            <div className="analytics-snapshot-item">
              <span>Global Contest Rank</span>
              <strong>{analytics.leetCodeSnapshot.contestRanking.globalRanking || 0}</strong>
            </div>
            <div className="analytics-snapshot-item">
              <span>Top Percentage</span>
              <strong>{analytics.leetCodeSnapshot.contestRanking.topPercentage || 0}%</strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel analytics-insights">
        <div className="panel__head">
          <h3>Insights</h3>
          <p>AI-style performance observations from your synced data</p>
        </div>

        {(analytics?.insights || []).length ? (
          <ul className="analytics-insight-list">
            {analytics.insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        ) : (
          <p className="empty-text">No insights yet. Sync LeetCode solves to generate analytics insights.</p>
        )}
      </section>
    </section>
  );
}

export default AnalyticsModule;
