import { useEffect, useMemo, useState } from 'react';

const emptyStory = {
  title: '',
  questionPrompt: '',
  companyContext: '',
  roleContext: '',
  story: {
    situation: '',
    task: '',
    action: '',
    result: '',
  },
  competenciesInput: '',
  tagsInput: '',
  quantifiedImpact: '',
  reflectionNotes: '',
  difficulty: 'medium',
  outcome: 'learning',
  confidenceScore: 0,
  isFavorite: false,
};

const buildInitialState = (story) => {
  if (!story) {
    return emptyStory;
  }

  return {
    title: story.title || '',
    questionPrompt: story.questionPrompt || '',
    companyContext: story.companyContext || '',
    roleContext: story.roleContext || '',
    story: {
      situation: story.story?.situation || '',
      task: story.story?.task || '',
      action: story.story?.action || '',
      result: story.story?.result || '',
    },
    competenciesInput: (story.competencies || []).join(', '),
    tagsInput: (story.tags || []).join(', '),
    quantifiedImpact: story.quantifiedImpact || '',
    reflectionNotes: story.reflectionNotes || '',
    difficulty: story.difficulty || 'medium',
    outcome: story.outcome || 'learning',
    confidenceScore: story.confidenceScore ?? 0,
    isFavorite: Boolean(story.isFavorite),
  };
};

const toArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function BehavioralStoryForm({ story, onSave, onCancel, saving }) {
  const [form, setForm] = useState(buildInitialState(story));

  useEffect(() => {
    setForm(buildInitialState(story));
  }, [story]);

  const heading = useMemo(
    () => (story ? 'Edit STAR Story' : 'Create STAR Story'),
    [story],
  );

  const updateStarField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      story: {
        ...prev.story,
        [field]: value,
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      title: form.title,
      questionPrompt: form.questionPrompt,
      companyContext: form.companyContext,
      roleContext: form.roleContext,
      story: {
        situation: form.story.situation,
        task: form.story.task,
        action: form.story.action,
        result: form.story.result,
      },
      competencies: toArray(form.competenciesInput),
      tags: toArray(form.tagsInput),
      quantifiedImpact: form.quantifiedImpact,
      reflectionNotes: form.reflectionNotes,
      difficulty: form.difficulty,
      outcome: form.outcome,
      confidenceScore: Number(form.confidenceScore) || 0,
      isFavorite: form.isFavorite,
    });
  };

  return (
    <section className="panel behavioral-form-panel">
      <div className="panel__head">
        <h2>{heading}</h2>
        <p>Store and refine stories with STAR structure</p>
      </div>

      <form className="behavioral-form" onSubmit={handleSubmit}>
        <label htmlFor="behavioral-title">Story Title</label>
        <input
          id="behavioral-title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          minLength={3}
          required
        />

        <label htmlFor="behavioral-question">Question Prompt</label>
        <input
          id="behavioral-question"
          value={form.questionPrompt}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              questionPrompt: event.target.value,
            }))
          }
          minLength={6}
          required
        />

        <div className="behavioral-grid-two">
          <div>
            <label htmlFor="behavioral-company">Company Context</label>
            <input
              id="behavioral-company"
              value={form.companyContext}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, companyContext: event.target.value }))
              }
            />
          </div>

          <div>
            <label htmlFor="behavioral-role">Role Context</label>
            <input
              id="behavioral-role"
              value={form.roleContext}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, roleContext: event.target.value }))
              }
            />
          </div>
        </div>

        <h3 className="behavioral-star-heading">STAR Breakdown</h3>

        <label htmlFor="behavioral-situation">Situation</label>
        <textarea
          id="behavioral-situation"
          rows={3}
          value={form.story.situation}
          onChange={(event) => updateStarField('situation', event.target.value)}
          required
          minLength={10}
        />

        <label htmlFor="behavioral-task">Task</label>
        <textarea
          id="behavioral-task"
          rows={2}
          value={form.story.task}
          onChange={(event) => updateStarField('task', event.target.value)}
          required
          minLength={6}
        />

        <label htmlFor="behavioral-action">Action</label>
        <textarea
          id="behavioral-action"
          rows={4}
          value={form.story.action}
          onChange={(event) => updateStarField('action', event.target.value)}
          required
          minLength={10}
        />

        <label htmlFor="behavioral-result">Result</label>
        <textarea
          id="behavioral-result"
          rows={3}
          value={form.story.result}
          onChange={(event) => updateStarField('result', event.target.value)}
          required
          minLength={8}
        />

        <label htmlFor="behavioral-impact">Quantified Impact</label>
        <input
          id="behavioral-impact"
          value={form.quantifiedImpact}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              quantifiedImpact: event.target.value,
            }))
          }
          placeholder="Example: Improved conversion by 18%"
        />

        <label htmlFor="behavioral-competencies">Competencies (comma separated)</label>
        <input
          id="behavioral-competencies"
          value={form.competenciesInput}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              competenciesInput: event.target.value,
            }))
          }
          placeholder="leadership, communication"
        />

        <label htmlFor="behavioral-tags">Tags (comma separated)</label>
        <input
          id="behavioral-tags"
          value={form.tagsInput}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              tagsInput: event.target.value,
            }))
          }
          placeholder="ownership, system-migration"
        />

        <label htmlFor="behavioral-reflection">Reflection Notes</label>
        <textarea
          id="behavioral-reflection"
          rows={3}
          value={form.reflectionNotes}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              reflectionNotes: event.target.value,
            }))
          }
        />

        <div className="behavioral-grid-three">
          <div>
            <label htmlFor="behavioral-difficulty">Difficulty</label>
            <select
              id="behavioral-difficulty"
              value={form.difficulty}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, difficulty: event.target.value }))
              }
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label htmlFor="behavioral-outcome">Outcome</label>
            <select
              id="behavioral-outcome"
              value={form.outcome}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, outcome: event.target.value }))
              }
            >
              <option value="success">Success</option>
              <option value="mixed">Mixed</option>
              <option value="learning">Learning</option>
            </select>
          </div>

          <div>
            <label htmlFor="behavioral-confidence">Confidence (0-10)</label>
            <input
              id="behavioral-confidence"
              type="number"
              min="0"
              max="10"
              value={form.confidenceScore}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  confidenceScore: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <label className="behavioral-favorite-toggle">
          <input
            type="checkbox"
            checked={form.isFavorite}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isFavorite: event.target.checked }))
            }
          />
          Mark as favorite story
        </label>

        <div className="behavioral-form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Story'}
          </button>
          <button type="button" className="button ghost" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default BehavioralStoryForm;
