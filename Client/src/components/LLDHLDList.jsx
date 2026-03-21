import LLDHLDViewer from './LLDHLDViewer';
import { useState } from 'react';

function LLDHLDList({ designs, isLoading, onDelete, onToggleCompletion, filters }) {
  const [viewingDesign, setViewingDesign] = useState(null);

  if (isLoading) {
    return <p className="loading">Loading designs...</p>;
  }

  if (!designs.length) {
    return (
      <div className="empty-state">
        <p>No designs found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <>
      {viewingDesign && (
        <LLDHLDViewer
          design={viewingDesign}
          onClose={() => setViewingDesign(null)}
          onToggleCompletion={onToggleCompletion}
          onDelete={onDelete}
        />
      )}

      <div className="lld-hld-list">
        <div className="list-header">
          <span className="col-status">Status</span>
          <span className="col-title">Title</span>
          <span className="col-type">Type</span>
          <span className="col-category">Category</span>
          <span className="col-difficulty">Difficulty</span>
          <span className="col-views">Views</span>
          <span className="col-actions">Actions</span>
        </div>

        {designs.map((design) => (
          <div key={design._id} className="list-item">
            <span className="col-status">
              <input
                type="checkbox"
                checked={design.isCompleted}
                onChange={() => onToggleCompletion(design._id)}
                className="status-checkbox"
                title={design.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              />
            </span>

            <span
              className="col-title clickable"
              onClick={() => setViewingDesign(design)}
              title="View design"
            >
              {design.title}
            </span>

            <span className="col-type">
              <span className={`badge badge-${design.designType.toLowerCase()}`}>
                {design.designType}
              </span>
            </span>

            <span className="col-category">
              <span className="badge">{design.category}</span>
            </span>

            <span className="col-difficulty">
              <span className={`difficulty-badge difficulty-${design.difficulty.toLowerCase()}`}>
                {design.difficulty}
              </span>
            </span>

            <span className="col-views">{design.viewCount}</span>

            <span className="col-actions">
              <button
                className="btn-icon btn-delete"
                onClick={() => onDelete(design._id)}
                title="Delete design"
              >
                🗑️
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default LLDHLDList;
