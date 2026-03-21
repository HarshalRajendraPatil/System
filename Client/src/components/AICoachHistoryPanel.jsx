import { useEffect, useMemo, useState } from 'react';
import PaginationControls from './PaginationControls';

function AICoachHistoryPanel({ history, onLoadItem, onDeleteItem, deletingId }) {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil((history || []).length / pageSize));
  const pagedHistory = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (history || []).slice(start, start + pageSize);
  }, [history, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <section className="panel ai-history-panel">
      <div className="panel__head">
        <h2>Coach History</h2>
        <p>Recent AI reports and motivation snapshots</p>
      </div>

      {history.length ? (
        <>
          <div className="ai-history-list">
          {pagedHistory.map((item) => (
            <article key={item._id} className="ai-history-item">
              <div>
                <h3>{item.type === 'motivation' ? 'Motivation' : 'Full Report'}</h3>
                <p>
                  {item.provider} • {item.model || 'n/a'}
                </p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div className="ai-history-actions">
                <button type="button" className="button ghost" onClick={() => onLoadItem(item)}>
                  Open
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => onDeleteItem(item._id)}
                  disabled={deletingId === item._id}
                >
                  {deletingId === item._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={history.length}
            pageSize={pageSize}
            onPageChange={(next) => setPage(Math.min(totalPages, Math.max(1, next)))}
          />
        </>
      ) : (
        <p className="empty-text">No AI history yet.</p>
      )}
    </section>
  );
}

export default AICoachHistoryPanel;
