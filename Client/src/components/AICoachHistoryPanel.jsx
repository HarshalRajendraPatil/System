function AICoachHistoryPanel({ history, onLoadItem }) {
  return (
    <section className="panel ai-history-panel">
      <div className="panel__head">
        <h2>Coach History</h2>
        <p>Recent AI reports and motivation snapshots</p>
      </div>

      {history.length ? (
        <div className="ai-history-list">
          {history.map((item) => (
            <article key={item._id} className="ai-history-item">
              <div>
                <h3>{item.type === 'motivation' ? 'Motivation' : 'Full Report'}</h3>
                <p>
                  {item.provider} • {item.model || 'n/a'}
                </p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <button type="button" className="button ghost" onClick={() => onLoadItem(item)}>
                Open
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-text">No AI history yet.</p>
      )}
    </section>
  );
}

export default AICoachHistoryPanel;
