import { useState } from 'react';

function BehavioralPracticePanel({
  randomStory,
  loading,
  onGenerate,
  onLogPractice,
  logging,
}) {
  const [practice, setPractice] = useState({
    mode: 'random',
    selfScore: 0,
    feedback: '',
    updateConfidence: true,
  });

  const submitPractice = (event) => {
    event.preventDefault();
    if (!randomStory?._id) {
      return;
    }

    onLogPractice(randomStory._id, {
      ...practice,
      selfScore: Number(practice.selfScore) || 0,
    });

    setPractice((prev) => ({
      ...prev,
      feedback: '',
    }));
  };

  return (
    <section className="panel behavioral-practice-panel">
      <div className="panel__head">
        <h2>Random Practice Mode</h2>
        <p>Pick a random STAR story and rehearse it with timed focus</p>
      </div>

      <button
        type="button"
        className="button"
        onClick={onGenerate}
        disabled={loading}
      >
        {loading ? 'Fetching Story...' : 'Generate Random Story'}
      </button>

      {randomStory ? (
        <article className="behavioral-random-card">
          <h3>{randomStory.title}</h3>
          <p className="behavioral-random-question">{randomStory.questionPrompt}</p>

          <div className="behavioral-star-grid">
            <div>
              <h4>Situation</h4>
              <p>{randomStory.story?.situation}</p>
            </div>
            <div>
              <h4>Task</h4>
              <p>{randomStory.story?.task}</p>
            </div>
            <div>
              <h4>Action</h4>
              <p>{randomStory.story?.action}</p>
            </div>
            <div>
              <h4>Result</h4>
              <p>{randomStory.story?.result}</p>
            </div>
          </div>

          <form className="behavioral-practice-form" onSubmit={submitPractice}>
            <div className="behavioral-grid-three">
              <div>
                <label htmlFor="practice-mode">Mode</label>
                <select
                  id="practice-mode"
                  value={practice.mode}
                  onChange={(event) =>
                    setPractice((prev) => ({ ...prev, mode: event.target.value }))
                  }
                >
                  <option value="random">Random</option>
                  <option value="targeted">Targeted</option>
                  <option value="review">Review</option>
                </select>
              </div>

              <div>
                <label htmlFor="practice-self-score">Self Score (0-10)</label>
                <input
                  id="practice-self-score"
                  type="number"
                  min="0"
                  max="10"
                  value={practice.selfScore}
                  onChange={(event) =>
                    setPractice((prev) => ({
                      ...prev,
                      selfScore: event.target.value,
                    }))
                  }
                />
              </div>

              <label className="behavioral-favorite-toggle practice-toggle">
                <input
                  type="checkbox"
                  checked={practice.updateConfidence}
                  onChange={(event) =>
                    setPractice((prev) => ({
                      ...prev,
                      updateConfidence: event.target.checked,
                    }))
                  }
                />
                Sync confidence with self score
              </label>
            </div>

            <label htmlFor="practice-feedback">Practice Feedback</label>
            <textarea
              id="practice-feedback"
              rows={2}
              value={practice.feedback}
              onChange={(event) =>
                setPractice((prev) => ({
                  ...prev,
                  feedback: event.target.value,
                }))
              }
              placeholder="What went well? What to improve next run?"
            />

            <button type="submit" className="button" disabled={logging}>
              {logging ? 'Logging...' : 'Log Practice Session'}
            </button>
          </form>
        </article>
      ) : (
        <p className="empty-text">Generate a random story to start practice mode.</p>
      )}
    </section>
  );
}

export default BehavioralPracticePanel;
