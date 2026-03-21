import { useEffect, useState } from 'react';
import { getLLDHLDDesignById } from '../api/lldHldApi';
import ReactMarkdown from 'react-markdown';

function LLDHLDViewer({ design, onClose, onToggleCompletion, onDelete }) {
  const [fullDesign, setFullDesign] = useState(design);
  const [loading, setLoading] = useState(!design?.content);

  useEffect(() => {
    if (!design?.content) {
      loadFullDesign();
    }
  }, [design]);

  const loadFullDesign = async () => {
    setLoading(true);
    try {
      const data = await getLLDHLDDesignById(design._id);
      setFullDesign(data);
    } catch (error) {
      console.error('Failed to load design:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="lld-hld-viewer-modal">
        <div className="viewer-container">
          <p className="loading">Loading design...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lld-hld-viewer-modal">
      <div className="viewer-container">
        {/* Header */}
        <div className="viewer-header">
          <div className="header-title">
            <h2>{fullDesign?.title}</h2>
            <div className="header-meta">
              <span className={`badge badge-${fullDesign?.designType.toLowerCase()}`}>
                {fullDesign?.designType}
              </span>
              <span className="badge">{fullDesign?.category}</span>
              <span className={`difficulty-badge difficulty-${fullDesign?.difficulty.toLowerCase()}`}>
                {fullDesign?.difficulty}
              </span>
              <span className="status-badge">Views: {fullDesign?.viewCount}</span>
            </div>
          </div>

          <button className="btn-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Description */}
        {fullDesign?.description && (
          <div className="viewer-description">
            <p>{fullDesign.description}</p>
          </div>
        )}

        {/* Content */}
        <div className="viewer-content markdown-content">
          <ReactMarkdown>{fullDesign?.content || ''}</ReactMarkdown>
        </div>

        {/* Tags */}
        {fullDesign?.tags?.length > 0 && (
          <div className="viewer-tags">
            <h4>Tags</h4>
            <div className="tags-display">
              {fullDesign.tags.map((tag, index) => (
                <span key={index} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {fullDesign?.resources?.length > 0 && (
          <div className="viewer-resources">
            <h4>Resources</h4>
            <div className="resources-list">
              {fullDesign.resources.map((resource, index) => (
                <div key={index} className="resource-item">
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    {resource.title}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {fullDesign?.notes && (
          <div className="viewer-notes">
            <h4>Notes</h4>
            <p>{fullDesign.notes}</p>
          </div>
        )}

        {/* Meta */}
        <div className="viewer-meta">
          <p className="meta-date">
            Created: {new Date(fullDesign?.createdAt).toLocaleDateString()}
          </p>
          {fullDesign?.isCompleted && (
            <p className="meta-completed">
              Completed: {new Date(fullDesign.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="viewer-actions">
          <button
            className={`btn ${fullDesign?.isCompleted ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => {
              onToggleCompletion(fullDesign._id);
              onClose();
            }}
          >
            {fullDesign?.isCompleted ? '✓ Completed' : 'Mark as Complete'}
          </button>

          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Delete this design?')) {
                onDelete(fullDesign._id);
                onClose();
              }
            }}
          >
            Delete
          </button>

          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LLDHLDViewer;
