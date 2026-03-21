function BehavioralStoryList({ stories, onEdit, onDelete }) {
  return (
    <section className="panel behavioral-list-panel">
      <div className="panel__head">
        <h2>STAR Story Vault</h2>
        <p>Searchable story inventory for interview practice</p>
      </div>

      {stories.length ? (
        <div className="behavioral-story-list">
          {stories.map((story) => (
            <article className="behavioral-story-row" key={story._id}>
              <div className="behavioral-story-main">
                <h3>
                  {story.title}
                  {story.isFavorite ? <span className="favorite-badge">Favorite</span> : null}
                </h3>
                <p className="behavioral-question">{story.questionPrompt}</p>
                <div className="behavioral-meta-row">
                  <span>{story.difficulty}</span>
                  <span>{story.outcome}</span>
                  <span>Confidence {story.confidenceScore}</span>
                  <span>Practice {story.practiceCount || 0}</span>
                </div>
                {(story.competencies || []).length ? (
                  <div className="behavioral-chip-cloud">
                    {(story.competencies || []).map((item) => (
                      <span key={item} className="behavioral-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="behavioral-story-actions">
                <button type="button" className="button ghost" onClick={() => onEdit(story)}>
                  Edit
                </button>
                <button type="button" className="button danger" onClick={() => onDelete(story._id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-text">No stories found. Add your first STAR story.</p>
      )}
    </section>
  );
}

export default BehavioralStoryList;
