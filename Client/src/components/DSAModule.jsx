import { useCallback, useEffect, useState } from 'react';
import {
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_LOCAL_EVENT,
} from '../constants/realtime';
import {
  createDSAProblem,
  deleteDSAProblem,
  getDSAProblems,
  getDSAStats,
} from '../api/dsaApi';
import DSALogForm from './DSALogForm';
import DSAProblemsList from './DSAProblemsList';
import DSAStats from './DSAStats';

function DSAModule() {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getDSAProblems(filters);
      setProblems(data || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load DSA problems');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getDSAStats();
      setStats(data);
    } catch {
      // Fail silently for stats
    }
  }, []);

  useEffect(() => {
    fetchProblems();
    fetchStats();
  }, [fetchProblems, fetchStats]);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event.detail || {};

      if (
        detail.event === REALTIME_EVENTS.DOMAIN_UPDATED
        && detail.payload?.domain === REALTIME_DOMAINS.DSA
      ) {
        setStatusMessage(detail.payload?.message || 'Live sync: DSA data updated on another device.');
        fetchProblems();
        fetchStats();
      }

      if (detail.event === REALTIME_EVENTS.USER_PROGRESS_UPDATED) {
        fetchStats();
      }
    };

    window.addEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
  }, [fetchProblems, fetchStats]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError('');
    setStatusMessage('');

    try {
      await createDSAProblem(payload);

      setStatusMessage('Problem logged successfully! XP earned.');
      setShowForm(false);

      await Promise.all([fetchProblems(), fetchStats()]);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save problem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (problemId) => {
    if (!window.confirm('Are you sure you want to delete this problem?')) {
      return;
    }

    setError('');
    setStatusMessage('');

    try {
      await deleteDSAProblem(problemId);

      setStatusMessage('Problem deleted.');
      await Promise.all([fetchProblems(), fetchStats()]);
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete problem');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <section className="dsa-module">
      <div className="dsa-header">
        <div>
          <h2>DSA Module</h2>
          <p>Track solved problems, gain XP, and level up your interview prep</p>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Log Problem'}
        </button>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
      {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}

      {showForm ? (
        <section className="panel dsa-form-section">
          <h3>Log a New Problem</h3>
          <DSALogForm onSubmit={handleSubmit} isSubmitting={submitting} />
        </section>
      ) : null}

      <DSAStats stats={stats} isLoading={loading} />

      <DSAProblemsList
        problems={problems}
        isLoading={loading}
        onDelete={handleDelete}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </section>
  );
}

export default DSAModule;
