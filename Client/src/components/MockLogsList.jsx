import { useEffect, useMemo, useState } from 'react';
import PaginationControls from './PaginationControls';

function MockLogsList({ logs, selectedDateKey, onEdit, onDelete, deletingId }) {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const visibleLogs = selectedDateKey
    ? logs.filter((entry) => entry.dateKey === selectedDateKey)
    : logs;
  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / pageSize));
  const pagedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleLogs.slice(start, start + pageSize);
  }, [visibleLogs, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <section className="panel mock-logs-panel">
      <div className="panel__head">
        <h2>Mock Logs</h2>
        <p>{selectedDateKey ? `Showing logs for ${selectedDateKey}` : 'Showing all logs'}</p>
      </div>

      {visibleLogs.length ? (
        <>
          <div className="mock-logs-list">
          {pagedLogs.map((entry) => (
            <article key={entry._id} className="mock-log-row">
              <div className="mock-log-main">
                <h3>{entry.title}</h3>
                <p>
                  {entry.dateKey} • {entry.format} • {entry.interviewerType}
                </p>
                <div className="mock-log-meta">
                  <span>Score {entry.overallScore}</span>
                  <span>Duration {entry.durationMinutes}m</span>
                  <span>
                    Confidence {entry.confidenceBefore} → {entry.confidenceAfter}
                  </span>
                </div>
                {(entry.weaknesses || []).length ? (
                  <div className="mock-log-weaknesses">
                    {(entry.weaknesses || []).map((weakness) => (
                      <span key={weakness}>{weakness}</span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mock-log-actions">
                <button type="button" className="button ghost" onClick={() => onEdit(entry)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => onDelete(entry._id)}
                  disabled={deletingId === entry._id}
                >
                  {deletingId === entry._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={visibleLogs.length}
            pageSize={pageSize}
            onPageChange={(next) => setPage(Math.min(totalPages, Math.max(1, next)))}
          />
        </>
      ) : (
        <p className="empty-text">No mock logs to show.</p>
      )}
    </section>
  );
}

export default MockLogsList;
