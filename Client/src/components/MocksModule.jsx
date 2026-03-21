import { useEffect, useMemo, useState } from 'react';
import {
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_LOCAL_EVENT,
} from '../constants/realtime';
import {
  createMockLog,
  deleteMockLog,
  getMockCalendar,
  getMockLogs,
  getMockTrends,
  updateMockLog,
} from '../api/mockApi';
import MockCalendarView from './MockCalendarView';
import MockLogForm from './MockLogForm';
import MockLogsList from './MockLogsList';
import MockTrendAnalytics from './MockTrendAnalytics';

const buildCurrentMonth = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

function MocksModule() {
  const [logs, setLogs] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [trends, setTrends] = useState(null);
  const [monthKey, setMonthKey] = useState(buildCurrentMonth());
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    format: '',
    interviewerType: '',
    weakness: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [rangeDays, setRangeDays] = useState(90);

  const activeFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      format: filters.format || undefined,
      interviewerType: filters.interviewerType || undefined,
      weakness: filters.weakness || undefined,
      limit: 350,
    }),
    [filters],
  );

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getMockLogs(activeFilters);
      setLogs(data || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load mock logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async (nextMonth = monthKey) => {
    try {
      const data = await getMockCalendar(nextMonth);
      setCalendar(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load mock calendar');
    }
  };

  const fetchTrends = async (days = rangeDays) => {
    try {
      const data = await getMockTrends(days);
      setTrends(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load trend analytics');
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchLogs(), fetchCalendar(), fetchTrends()]);
  };

  useEffect(() => {
    fetchLogs();
  }, [activeFilters]);

  useEffect(() => {
    fetchCalendar(monthKey);
  }, [monthKey]);

  useEffect(() => {
    fetchTrends(rangeDays);
  }, [rangeDays]);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event.detail || {};

      if (
        detail.event === REALTIME_EVENTS.DOMAIN_UPDATED
        && detail.payload?.domain === REALTIME_DOMAINS.MOCKS
      ) {
        setStatusMessage(detail.payload?.message || 'Live sync: Mock logs updated on another device.');
        refreshAll();
      }
    };

    window.addEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
  });

  const onSave = async (payload) => {
    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      if (editingEntry?._id) {
        await updateMockLog(editingEntry._id, payload);
        setStatusMessage('Mock log updated successfully.');
      } else {
        await createMockLog(payload);
        setStatusMessage('Mock log created successfully.');
      }

      setShowForm(false);
      setEditingEntry(null);
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save mock log');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this mock log?')) {
      return;
    }

    setDeletingId(id);
    setError('');
    setStatusMessage('');

    try {
      await deleteMockLog(id);
      setStatusMessage('Mock log deleted.');
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete mock log');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="mocks-module">
      <section className="panel mocks-toolbar">
        <div className="panel__head">
          <h2>Mocks Workspace</h2>
          <p>Score logging, weaknesses tracking, calendar view, and trend analytics</p>
        </div>

        <div className="mocks-toolbar-controls">
          <input
            type="text"
            placeholder="Search title, notes, weaknesses"
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                search: event.target.value,
              }))
            }
          />

          <select
            value={filters.format}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                format: event.target.value,
              }))
            }
          >
            <option value="">All Formats</option>
            <option value="mixed">Mixed</option>
            <option value="dsa">DSA</option>
            <option value="system_design">System Design</option>
            <option value="behavioral">Behavioral</option>
          </select>

          <select
            value={filters.interviewerType}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                interviewerType: event.target.value,
              }))
            }
          >
            <option value="">All Interviewers</option>
            <option value="self">Self</option>
            <option value="peer">Peer</option>
            <option value="mentor">Mentor</option>
            <option value="ai">AI</option>
            <option value="panel">Panel</option>
          </select>

          <input
            type="text"
            placeholder="Weakness filter"
            value={filters.weakness}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                weakness: event.target.value,
              }))
            }
          />

          <select
            value={rangeDays}
            onChange={(event) => setRangeDays(Number(event.target.value) || 90)}
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>

          <button
            type="button"
            className="button"
            onClick={() => {
              if (showForm) {
                setEditingEntry(null);
              }
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? 'Close Form' : '+ Log Mock'}
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}
      </section>

      {showForm ? (
        <MockLogForm
          entry={editingEntry}
          onSubmit={onSave}
          onCancel={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
          saving={saving}
        />
      ) : null}

      <MockTrendAnalytics trends={trends} />

      <MockCalendarView
        monthKey={monthKey}
        calendarData={calendar}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={(dateKey) =>
          setSelectedDateKey((prev) => (prev === dateKey ? '' : dateKey))
        }
        onChangeMonth={setMonthKey}
      />

      {loading ? (
        <p className="loading">Loading mocks data...</p>
      ) : (
        <MockLogsList
          logs={logs}
          selectedDateKey={selectedDateKey}
          onEdit={(entry) => {
            setEditingEntry(entry);
            setShowForm(true);
          }}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      )}
    </section>
  );
}

export default MocksModule;
