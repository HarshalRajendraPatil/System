const STATUS_LABELS = {
  idea: 'Idea',
  planning: 'Planning',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  shipped: 'Shipped',
  archived: 'Archived',
};

const STATUS_ORDER = ['idea', 'planning', 'in_progress', 'blocked', 'shipped', 'archived'];

function ProjectsBoard({ columns, moving, onMove, onDelete, onEdit }) {
  const onDragStart = (event, projectId, currentStatus) => {
    event.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        projectId,
        currentStatus,
      }),
    );
  };

  const onDropToColumn = (event, toStatus) => {
    event.preventDefault();

    const payloadText = event.dataTransfer.getData('text/plain');
    if (!payloadText) {
      return;
    }

    try {
      const payload = JSON.parse(payloadText);
      if (payload.projectId && payload.currentStatus !== toStatus) {
        onMove(payload.projectId, toStatus);
      }
    } catch {
      // Ignore malformed DnD payload.
    }
  };

  return (
    <section className="panel projects-board-panel">
      <div className="panel__head">
        <h2>Projects Kanban</h2>
        <p>Drag cards to move status, or use quick move actions</p>
      </div>

      <div className="projects-board-grid">
        {STATUS_ORDER.map((status) => {
          const cards = columns?.[status] || [];

          return (
            <div
              key={status}
              className="project-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropToColumn(event, status)}
            >
              <header className="project-column-header">
                <h3>{STATUS_LABELS[status]}</h3>
                <span>{cards.length}</span>
              </header>

              <div className="project-column-body">
                {cards.length ? (
                  cards.map((card) => (
                    <article
                      key={card._id}
                      className="project-card"
                      draggable={!moving}
                      onDragStart={(event) => onDragStart(event, card._id, card.status)}
                    >
                      <div className="project-card-head">
                        <h4>{card.title}</h4>
                        <span className={`project-priority project-priority-${card.priority}`}>
                          {card.priority}
                        </span>
                      </div>

                      {card.summary ? <p className="project-card-summary">{card.summary}</p> : null}

                      <div className="project-card-metrics">
                        <span>Impact {card.impactScore}</span>
                        <span>Users {card.impact?.usersImpacted || 0}</span>
                      </div>

                      {Array.isArray(card.techStack) && card.techStack.length ? (
                        <div className="project-card-tags">
                          {card.techStack.slice(0, 4).map((tech) => (
                            <span key={tech}>{tech}</span>
                          ))}
                        </div>
                      ) : null}

                      <div className="project-card-actions">
                        <button
                          type="button"
                          className="button ghost"
                          onClick={() => onEdit(card)}
                          disabled={moving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button danger"
                          onClick={() => onDelete(card._id)}
                          disabled={moving}
                        >
                          Delete
                        </button>
                      </div>

                      <label className="project-move-inline" htmlFor={`move-${card._id}`}>
                        Move To
                      </label>
                      <select
                        id={`move-${card._id}`}
                        value={card.status}
                        onChange={(event) => onMove(card._id, event.target.value)}
                        disabled={moving}
                      >
                        {STATUS_ORDER.map((option) => (
                          <option key={option} value={option}>
                            {STATUS_LABELS[option]}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))
                ) : (
                  <p className="empty-text">No projects in this stage.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ProjectsBoard;
