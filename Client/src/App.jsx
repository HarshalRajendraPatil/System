import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import './App.css';
import { getCurrentUser, logoutUser } from './api/authApi';
import { getDailyQuestHistory, getDashboard, updateDailyQuest } from './api/rpgApi';
import { REALTIME_DOMAINS } from './constants/realtime';
import RealtimeCenter from './components/RealtimeCenter';
import AuthPanel from './components/AuthPanel';
import DailyQuestPanel from './components/DailyQuestPanel';
import Leaderboard from './components/Leaderboard';
import LevelProgress from './components/LevelProgress';
import StatCard from './components/StatCard';
import DSAModule from './components/DSAModule';
import LLDHLDVault from './components/LLDHLDVault';
import ProjectsModule from './components/ProjectsModule';
import MocksModule from './components/MocksModule';
import BehavioralModule from './components/BehavioralModule';
import AICoachModule from './components/AICoachModule';
import PortfolioModule from './components/PortfolioModule';
import { formatDateLabel, calculateQuestXpPreview } from './utils/rpgMath';

const buildQuestState = (quest) => ({
  dateKey: quest?.dateKey || '',
  dsa: Boolean(quest?.dsa),
  lldHld: Boolean(quest?.lldHld),
  projectWork: Boolean(quest?.projectWork),
  theoryRevision: Boolean(quest?.theoryRevision),
  mockInterview: Boolean(quest?.mockInterview),
  behavioralStories: Boolean(quest?.behavioralStories),
  hoursLogged: Number.isFinite(Number(quest?.hoursLogged)) ? String(quest.hoursLogged) : '0',
  dsaDifficulty: quest?.dsaDifficulty || 'Easy',
});

const launchLevelUpConfetti = () => {
  confetti({
    particleCount: 180,
    spread: 70,
    origin: { x: 0.2, y: 0.5 },
  });

  confetti({
    particleCount: 180,
    spread: 70,
    origin: { x: 0.8, y: 0.5 },
  });
};

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [quest, setQuest] = useState(buildQuestState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const realtimeRefreshTimerRef = useRef(null);
  const publicPortfolioSlug = useMemo(
    () => new URLSearchParams(window.location.search).get('portfolio') || '',
    [],
  );

  const questXpPreview = useMemo(() => calculateQuestXpPreview(quest), [quest]);

  const applyDashboardBundle = useCallback((dashboardData, historyData) => {
    setDashboard(dashboardData);
    setHistory((historyData || []).slice(0, 7));
    setQuest(buildQuestState(dashboardData?.todayQuest));
  }, []);

  const fetchDashboardBundle = useCallback(
    () =>
      Promise.all([
        getDashboard(),
        getDailyQuestHistory(),
      ]),
    [],
  );

  const hydrateData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [dashboardData, historyData] = await fetchDashboardBundle();
      applyDashboardBundle(dashboardData, historyData);
    } catch (requestError) {
      const message = requestError.message || 'Unable to load dashboard data.';
      if (/session|log in|authentication/i.test(message)) {
        setCurrentUser(null);
        setDashboard(null);
        setHistory([]);
        setQuest(buildQuestState());
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [applyDashboardBundle, fetchDashboardBundle]);

  const hydrateDataSilently = useCallback(async () => {
    try {
      const [dashboardData, historyData] = await fetchDashboardBundle();
      applyDashboardBundle(dashboardData, historyData);
    } catch {
      // Silent sync should not interrupt the current screen.
    }
  }, [applyDashboardBundle, fetchDashboardBundle]);

  const scheduleSilentRealtimeSync = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = setTimeout(() => {
      hydrateDataSilently();
    }, 900);
  }, [hydrateDataSilently]);

  useEffect(() => {
    const bootstrap = async () => {
      if (publicPortfolioSlug) {
        setAuthChecking(false);
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setAuthChecking(true);
      setError('');

      try {
        const session = await getCurrentUser();
        setCurrentUser(session.user);
        await hydrateData();
      } catch {
        setCurrentUser(null);
        setDashboard(null);
        setLoading(false);
      } finally {
        setAuthChecking(false);
      }
    };

    bootstrap();
  }, [hydrateData, publicPortfolioSlug]);

  useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );

  const onAuthenticated = async (user) => {
    setCurrentUser(user);
    await hydrateData();
  };

  const onLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout failures and clear local auth state.
    }

    setCurrentUser(null);
    setDashboard(null);
    setHistory([]);
    setQuest(buildQuestState());
    setError('');
    setStatusMessage('');
    setActiveTab('dashboard');
    setLoading(false);

    if (realtimeRefreshTimerRef.current) {
      clearTimeout(realtimeRefreshTimerRef.current);
    }
  };

  const onToggleQuest = (key, checked) => {
    setQuest((previousQuest) => ({
      ...previousQuest,
      [key]: checked,
    }));
  };

  const onHoursChange = (value) => {
    setQuest((previousQuest) => ({
      ...previousQuest,
      hoursLogged: value,
    }));
  };

  const onDifficultyChange = (value) => {
    setQuest((previousQuest) => ({
      ...previousQuest,
      dsaDifficulty: value,
    }));
  };

  const submitQuest = async () => {
    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      const payload = {
        ...quest,
        hoursLogged: Number(quest.hoursLogged) || 0,
      };

      const response = await updateDailyQuest(payload);

      const previousLevel = dashboard?.profile?.level || 1;
      const nextDashboard = {
        profile: response.profile,
        level: response.level,
        rank: response.rank,
        todayQuest: response.quest,
        leaderboard: response.leaderboard,
      };

      setDashboard(nextDashboard);
      setQuest(buildQuestState(response.quest));

      const historyData = await getDailyQuestHistory();
      setHistory(historyData.slice(0, 7));

      if (response.leveledUp || response.profile.level > previousLevel) {
        launchLevelUpConfetti();
        setStatusMessage(`Level up! You are now level ${response.profile.level}.`);
      } else {
        setStatusMessage('Quest progress saved successfully.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to save quest data.');
    } finally {
      setSaving(false);
    }
  };

  if (authChecking) {
    return (
      <main className="app-shell">
        <p className="loading">Verifying secure session...</p>
      </main>
    );
  }

  if (publicPortfolioSlug) {
    return (
      <main className="app-shell">
        <PortfolioModule publicSlug={publicPortfolioSlug} />
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPanel onAuthenticated={onAuthenticated} />;
  }

  if (loading) {
    return (
      <main className="app-shell">
        <p className="loading">Loading GrindForge Core RPG...</p>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="app-shell">
        <p className="error-banner">Could not load dashboard. Please retry.</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">GrindForge</p>
        <h1>Placement RPG Dashboard</h1>
        <p className="hero-copy">
          Master DSA, LLD, mocks, and behavioral prep with gamified tracking and AI-powered insights.
        </p>
        <div className="hero-actions">
          <span className="signed-in-user">Signed in as {currentUser.displayName}</span>
          <button type="button" className="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <RealtimeCenter
        onProgressUpdated={(payload) => {
          if (!payload) {
            return;
          }

          setDashboard((previousDashboard) => {
            if (!previousDashboard) {
              return previousDashboard;
            }

            return {
              ...previousDashboard,
              profile: payload.profile || previousDashboard.profile,
              level: payload.level || previousDashboard.level,
              rank: payload.rank || previousDashboard.rank,
              todayQuest: payload.todayQuest || previousDashboard.todayQuest,
              leaderboard: payload.leaderboard || previousDashboard.leaderboard,
            };
          });

          if (payload.todayQuest) {
            setQuest(buildQuestState(payload.todayQuest));
          }

          scheduleSilentRealtimeSync();
        }}
        onLeaderboardUpdated={(payload) => {
          if (payload?.leaderboard?.length) {
            setDashboard((previousDashboard) => {
              if (!previousDashboard) {
                return previousDashboard;
              }

              return {
                ...previousDashboard,
                leaderboard: payload.leaderboard,
              };
            });
          } else {
            scheduleSilentRealtimeSync();
          }
        }}
        onDomainUpdated={(payload) => {
          const domain = payload?.domain || REALTIME_DOMAINS.RPG;
          const domainLabel = String(domain).replace('_', '/');
          const actionLabel = payload?.action || 'updated';

          setStatusMessage(payload?.message || `Live sync: ${domainLabel} ${actionLabel}.`);
        }}
      />

      <nav className="nav-tabs">
        <button
          type="button"
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'dsa' ? 'active' : ''}`}
          onClick={() => setActiveTab('dsa')}
        >
          DSA Module
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'lld-hld' ? 'active' : ''}`}
          onClick={() => setActiveTab('lld-hld')}
        >
          LLD/HLD Vault
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'mocks' ? 'active' : ''}`}
          onClick={() => setActiveTab('mocks')}
        >
          Mocks
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'behavioral' ? 'active' : ''}`}
          onClick={() => setActiveTab('behavioral')}
        >
          Behavioral
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Coach
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          Portfolio
        </button>
      </nav>

      {activeTab === 'dashboard' ? (
        <>
          {error ? <p className="error-banner">{error}</p> : null}
          {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}

          <section className="stats-grid">
            <StatCard
              label="Current Streak"
              value={`🔥 ${dashboard.profile.currentStreak}`}
              helper={`Longest: ${dashboard.profile.longestStreak}`}
            />
            <StatCard
              label="Level"
              value={`${dashboard.profile.level} / ${dashboard.profile.levelCap}`}
              helper={`${dashboard.profile.xpToNextLevel} XP to next level`}
            />
            <StatCard
              label="Total XP"
              value={dashboard.profile.totalXp}
              helper={`${dashboard.profile.levelProgressPercent}% progress in current level`}
            />
            <StatCard
              label="Leaderboard Rank"
              value={`#${dashboard.rank}`}
              helper="Global mode ready"
            />
          </section>

          <LevelProgress
            level={dashboard.profile.level}
            levelCap={dashboard.profile.levelCap}
            progressPercent={dashboard.profile.levelProgressPercent}
            xpToNextLevel={dashboard.profile.xpToNextLevel}
            xpInCurrentLevel={dashboard.profile.xpInCurrentLevel}
          />

          <section className="feature-grid">
            <DailyQuestPanel
              dateLabel={formatDateLabel(quest.dateKey)}
              quest={quest}
              xpPreview={questXpPreview}
              onToggle={onToggleQuest}
              onHoursChange={onHoursChange}
              onDifficultyChange={onDifficultyChange}
              onSubmit={submitQuest}
              isSaving={saving}
            />

            <Leaderboard items={dashboard.leaderboard || []} />
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Recent Quest History</h2>
              <p>Last 7 tracked days</p>
            </div>

            {history.length ? (
              <div className="history-list">
                {history.map((entry) => (
                  <article key={entry._id || entry.dateKey} className="history-row">
                    <span>{formatDateLabel(entry.dateKey)}</span>
                    <span>{entry.completed ? 'Completed' : 'In Progress'}</span>
                    <strong>{entry.xpEarned} XP</strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-text">No entries yet. Save your first daily quest.</p>
            )}
          </section>
        </>
      ) : null}

      {activeTab === 'dsa' ? <DSAModule /> : null}

      {activeTab === 'lld-hld' ? <LLDHLDVault /> : null}

      {activeTab === 'projects' ? <ProjectsModule /> : null}

      {activeTab === 'mocks' ? <MocksModule /> : null}

      {activeTab === 'behavioral' ? <BehavioralModule /> : null}

      {activeTab === 'ai' ? <AICoachModule /> : null}

      {activeTab === 'portfolio' ? <PortfolioModule /> : null}
    </main>
  );
}

export default App;
