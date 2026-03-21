import { useMemo, useState } from 'react';

const initialImpactState = {
  usersImpacted: 0,
  revenueImpact: 0,
  performanceGainPercent: 0,
  timeSavedHours: 0,
  qualityScore: 0,
  adoptionRatePercent: 0,
  confidence: 'medium',
};

const initialFormState = {
  title: '',
  summary: '',
  description: '',
  status: 'idea',
  priority: 'medium',
  tagsInput: '',
  techStackInput: '',
  repositoryUrl: '',
  demoUrl: '',
  startedAt: '',
  targetDate: '',
  impact: initialImpactState,
};

const fromProjectToForm = (project) => {
  if (!project) {
    return initialFormState;
  }

  return {
    title: project.title || '',
    summary: project.summary || '',
    description: project.description || '',
    status: project.status || 'idea',
    priority: project.priority || 'medium',
    tagsInput: Array.isArray(project.tags) ? project.tags.join(', ') : '',
    techStackInput: Array.isArray(project.techStack) ? project.techStack.join(', ') : '',
    repositoryUrl: project.repositoryUrl || '',
    demoUrl: project.demoUrl || '',
    startedAt: project.startedAt ? project.startedAt.slice(0, 10) : '',
    targetDate: project.targetDate ? project.targetDate.slice(0, 10) : '',
    impact: {
      usersImpacted: project.impact?.usersImpacted || 0,
      revenueImpact: project.impact?.revenueImpact || 0,
      performanceGainPercent: project.impact?.performanceGainPercent || 0,
      timeSavedHours: project.impact?.timeSavedHours || 0,
      qualityScore: project.impact?.qualityScore || 0,
      adoptionRatePercent: project.impact?.adoptionRatePercent || 0,
      confidence: project.impact?.confidence || 'medium',
    },
  };
};

function ProjectForm({ project, onSave, onCancel, saving }) {
  const [form, setForm] = useState(fromProjectToForm(project));

  const title = useMemo(
    () => (project ? 'Edit Project' : 'Create Project'),
    [project],
  );

  const updateImpact = (key, value) => {
    setForm((prev) => ({
      ...prev,
      impact: {
        ...prev.impact,
        [key]: value,
      },
    }));
  };

  const onSubmit = (event) => {
    event.preventDefault();

    const payload = {
      title: form.title,
      summary: form.summary,
      description: form.description,
      status: form.status,
      priority: form.priority,
      tags: form.tagsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      techStack: form.techStackInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      repositoryUrl: form.repositoryUrl,
      demoUrl: form.demoUrl,
      startedAt: form.startedAt || null,
      targetDate: form.targetDate || null,
      impact: {
        usersImpacted: Number(form.impact.usersImpacted) || 0,
        revenueImpact: Number(form.impact.revenueImpact) || 0,
        performanceGainPercent: Number(form.impact.performanceGainPercent) || 0,
        timeSavedHours: Number(form.impact.timeSavedHours) || 0,
        qualityScore: Number(form.impact.qualityScore) || 0,
        adoptionRatePercent: Number(form.impact.adoptionRatePercent) || 0,
        confidence: form.impact.confidence,
      },
    };

    onSave(payload);
  };

  return (
    <section className="panel project-form-panel">
      <div className="panel__head">
        <h2>{title}</h2>
        <p>Track progress, movement, and measurable impact</p>
      </div>

      <form className="project-form" onSubmit={onSubmit}>
        <label htmlFor="project-title">Project Title</label>
        <input
          id="project-title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
          minLength={3}
        />

        <label htmlFor="project-summary">Summary</label>
        <input
          id="project-summary"
          value={form.summary}
          onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
        />

        <label htmlFor="project-description">Description</label>
        <textarea
          id="project-description"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={5}
        />

        <div className="project-form-grid-two">
          <div>
            <label htmlFor="project-status">Status</label>
            <select
              id="project-status"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="idea">Idea</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="shipped">Shipped</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label htmlFor="project-priority">Priority</label>
            <select
              id="project-priority"
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="project-form-grid-two">
          <div>
            <label htmlFor="project-started-at">Started At</label>
            <input
              id="project-started-at"
              type="date"
              value={form.startedAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startedAt: event.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="project-target-date">Target Date</label>
            <input
              id="project-target-date"
              type="date"
              value={form.targetDate}
              onChange={(event) => setForm((prev) => ({ ...prev, targetDate: event.target.value }))}
            />
          </div>
        </div>

        <label htmlFor="project-tags">Tags (comma separated)</label>
        <input
          id="project-tags"
          value={form.tagsInput}
          onChange={(event) => setForm((prev) => ({ ...prev, tagsInput: event.target.value }))}
        />

        <label htmlFor="project-tech-stack">Tech Stack (comma separated)</label>
        <input
          id="project-tech-stack"
          value={form.techStackInput}
          onChange={(event) => setForm((prev) => ({ ...prev, techStackInput: event.target.value }))}
        />

        <label htmlFor="project-repository-url">Repository URL</label>
        <input
          id="project-repository-url"
          value={form.repositoryUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, repositoryUrl: event.target.value }))}
          placeholder="https://github.com/..."
        />

        <label htmlFor="project-demo-url">Demo URL</label>
        <input
          id="project-demo-url"
          value={form.demoUrl}
          onChange={(event) => setForm((prev) => ({ ...prev, demoUrl: event.target.value }))}
          placeholder="https://..."
        />

        <h3 className="project-impact-heading">Impact Inputs</h3>

        <div className="project-form-grid-two">
          <div>
            <label htmlFor="impact-users">Users Impacted</label>
            <input
              id="impact-users"
              type="number"
              min="0"
              value={form.impact.usersImpacted}
              onChange={(event) => updateImpact('usersImpacted', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="impact-revenue">Revenue Impact ($)</label>
            <input
              id="impact-revenue"
              type="number"
              min="0"
              value={form.impact.revenueImpact}
              onChange={(event) => updateImpact('revenueImpact', event.target.value)}
            />
          </div>
        </div>

        <div className="project-form-grid-two">
          <div>
            <label htmlFor="impact-performance">Performance Gain (%)</label>
            <input
              id="impact-performance"
              type="number"
              min="0"
              value={form.impact.performanceGainPercent}
              onChange={(event) => updateImpact('performanceGainPercent', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="impact-time-saved">Time Saved (hours)</label>
            <input
              id="impact-time-saved"
              type="number"
              min="0"
              value={form.impact.timeSavedHours}
              onChange={(event) => updateImpact('timeSavedHours', event.target.value)}
            />
          </div>
        </div>

        <div className="project-form-grid-two">
          <div>
            <label htmlFor="impact-quality">Quality Score (0-100)</label>
            <input
              id="impact-quality"
              type="number"
              min="0"
              max="100"
              value={form.impact.qualityScore}
              onChange={(event) => updateImpact('qualityScore', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="impact-adoption">Adoption Rate (%)</label>
            <input
              id="impact-adoption"
              type="number"
              min="0"
              max="100"
              value={form.impact.adoptionRatePercent}
              onChange={(event) => updateImpact('adoptionRatePercent', event.target.value)}
            />
          </div>
        </div>

        <label htmlFor="impact-confidence">Confidence</label>
        <select
          id="impact-confidence"
          value={form.impact.confidence}
          onChange={(event) => updateImpact('confidence', event.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <div className="project-form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Project'}
          </button>
          <button type="button" className="button ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProjectForm;
