import { useEffect, useState } from 'react';
import {
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_LOCAL_EVENT,
} from '../constants/realtime';
import {
  deleteAiInsightHistoryItem,
  generateAiCoachReport,
  generateAiMotivation,
  getAiInsightHistory,
  getAiSnapshot,
  getLatestAiInsight,
} from '../api/aiApi';
import AICoachHistoryPanel from './AICoachHistoryPanel';
import AICoachReportPanel from './AICoachReportPanel';

function AICoachModule() {
  const [report, setReport] = useState(null);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [history, setHistory] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [form, setForm] = useState({
    focusArea: '',
    tone: 'balanced',
    customPrompt: '',
  });

  const fetchHistory = async () => {
    try {
      const data = await getAiInsightHistory({ limit: 20 });
      setHistory(data || []);
    } catch {
      // History should not block report generation.
    }
  };

  const fetchLatest = async () => {
    try {
      const latest = await getLatestAiInsight();
      if (latest?.insight) {
        setReport(latest.insight);
        setProvider(latest.provider || '');
        setModel(latest.model || '');
        setGeneratedAt(latest.createdAt || '');
      }
    } catch {
      // Ignore if no existing insight.
    }
  };

  const fetchSnapshot = async () => {
    setSnapshotLoading(true);

    try {
      const data = await getAiSnapshot();
      setSnapshot(data);
    } catch {
      // Snapshot can fail without blocking AI generation.
    } finally {
      setSnapshotLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    fetchHistory();
    fetchSnapshot();
  }, []);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event.detail || {};

      if (
        detail.event === REALTIME_EVENTS.DOMAIN_UPDATED
        && detail.payload?.domain === REALTIME_DOMAINS.AI
      ) {
        setStatusMessage(detail.payload?.message || 'Live sync: AI insights updated on another device.');
        fetchLatest();
        fetchHistory();
      }

      if (detail.event === REALTIME_EVENTS.USER_PROGRESS_UPDATED) {
        fetchSnapshot();
      }

      if (
        detail.event === REALTIME_EVENTS.DOMAIN_UPDATED
        && [
          REALTIME_DOMAINS.RPG,
          REALTIME_DOMAINS.DSA,
          REALTIME_DOMAINS.MOCKS,
          REALTIME_DOMAINS.BEHAVIORAL,
          REALTIME_DOMAINS.PROJECTS,
        ].includes(detail.payload?.domain)
      ) {
        fetchSnapshot();
      }
    };

    window.addEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
  });

  const runFullReport = async () => {
    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const data = await generateAiCoachReport({
        focusArea: form.focusArea,
        tone: form.tone,
        customPrompt: form.customPrompt,
      });

      setReport(data.report || null);
      setProvider(data.provider || '');
      setModel(data.model || '');
      setGeneratedAt(data.generatedAt || new Date().toISOString());
      setSnapshot(data.snapshot || null);
      setStatusMessage('AI coaching report generated successfully.');
      await fetchHistory();
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate AI report');
    } finally {
      setLoading(false);
    }
  };

  const runMotivation = async () => {
    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const data = await generateAiMotivation({
        focusArea: form.focusArea,
        tone: form.tone,
        customPrompt: form.customPrompt,
      });

      if (data.report) {
        setReport((prev) => ({
          ...(prev || {}),
          motivation: data.report.motivation,
          focusTheme: data.report.focusTheme,
        }));
      }

      setProvider(data.provider || '');
      setModel(data.model || '');
      setGeneratedAt(data.generatedAt || new Date().toISOString());
      setStatusMessage('Fresh motivation generated.');
      await fetchHistory();
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate motivation');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteHistoryItem = async (insightId) => {
    if (!insightId) {
      return;
    }

    if (!window.confirm('Delete this AI coach history item?')) {
      return;
    }

    setDeletingId(insightId);
    setError('');
    setStatusMessage('');

    try {
      await deleteAiInsightHistoryItem(insightId);
      setStatusMessage('AI coach history item deleted.');
      await fetchHistory();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete AI coach history item');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="ai-module">
      <section className="panel ai-toolbar-panel">
        <div className="panel__head">
          <h2>AI Interview Coach</h2>
          <p>Grok-powered suggestions, motivation, weakness analysis, and streak projection</p>
        </div>

        <div className="ai-toolbar-grid">
          <input
            type="text"
            placeholder="Focus area (e.g. system design, confidence, DSA speed)"
            value={form.focusArea}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                focusArea: event.target.value,
              }))
            }
          />

          <select
            value={form.tone}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                tone: event.target.value,
              }))
            }
          >
            <option value="balanced">Balanced</option>
            <option value="tough_love">Tough Love</option>
            <option value="supportive">Supportive</option>
          </select>

          <input
            type="text"
            placeholder="Custom ask (optional)"
            value={form.customPrompt}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                customPrompt: event.target.value,
              }))
            }
          />

          <button type="button" className="button" disabled={loading} onClick={runFullReport}>
            {loading ? 'Generating...' : 'Generate Full Report'}
          </button>

          <button type="button" className="button ghost" disabled={loading} onClick={runMotivation}>
            Quick Motivation
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}
      </section>

      <section className="panel ai-snapshot-panel">
        <div className="panel__head">
          <h2>Performance Snapshot</h2>
          <p>Signals sent to the AI coach for recommendation quality</p>
        </div>

        {snapshotLoading ? (
          <p className="empty-text">Loading snapshot...</p>
        ) : snapshot ? (
          <div className="ai-snapshot-grid">
            <article>
              <p>Level</p>
              <strong>{snapshot.profile?.level || 0}</strong>
            </article>
            <article>
              <p>Current Streak</p>
              <strong>{snapshot.profile?.currentStreak || 0}</strong>
            </article>
            <article>
              <p>14d Completion</p>
              <strong>{Math.round((snapshot.questSignals?.consistency14?.completionRate || 0) * 100)}%</strong>
            </article>
            <article>
              <p>Mock Avg</p>
              <strong>{snapshot.mockTrends?.summary?.averageScore || 0}</strong>
            </article>
            <article>
              <p>Behavioral Stories</p>
              <strong>{snapshot.behavioralAnalytics?.totals?.totalStories || 0}</strong>
            </article>
            <article>
              <p>Projects Shipped</p>
              <strong>{snapshot.projectMetrics?.throughputShipped || 0}</strong>
            </article>
          </div>
        ) : (
          <p className="empty-text">Snapshot unavailable right now.</p>
        )}
      </section>

      <AICoachReportPanel
        report={report}
        provider={provider}
        model={model}
        generatedAt={generatedAt}
      />

      <AICoachHistoryPanel
        history={history}
        deletingId={deletingId}
        onLoadItem={(item) => {
          setReport(item.insight || null);
          setProvider(item.provider || '');
          setModel(item.model || '');
          setGeneratedAt(item.createdAt || '');
        }}
        onDeleteItem={onDeleteHistoryItem}
      />
    </section>
  );
}

export default AICoachModule;
