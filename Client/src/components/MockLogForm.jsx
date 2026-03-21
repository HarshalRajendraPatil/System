import { useEffect, useMemo, useState } from 'react';

const defaultSectionScores = {
  coding: 0,
  problemSolving: 0,
  systemDesign: 0,
  communication: 0,
  behavioral: 0,
};

const buildInitialForm = (entry) => {
  if (!entry) {
    return {
      title: '',
      dateKey: new Date().toISOString().slice(0, 10),
      format: 'mixed',
      interviewerType: 'self',
      overallScore: 0,
      sectionScores: defaultSectionScores,
      confidenceBefore: 0,
      confidenceAfter: 0,
      durationMinutes: 0,
      strengthsInput: '',
      weaknessesInput: '',
      actionItemsInput: '',
      notes: '',
    };
  }

  return {
    title: entry.title || '',
    dateKey: entry.dateKey || new Date().toISOString().slice(0, 10),
    format: entry.format || 'mixed',
    interviewerType: entry.interviewerType || 'self',
    overallScore: entry.overallScore ?? 0,
    sectionScores: {
      ...defaultSectionScores,
      ...(entry.sectionScores || {}),
    },
    confidenceBefore: entry.confidenceBefore ?? 0,
    confidenceAfter: entry.confidenceAfter ?? 0,
    durationMinutes: entry.durationMinutes ?? 0,
    strengthsInput: (entry.strengths || []).join(', '),
    weaknessesInput: (entry.weaknesses || []).join(', '),
    actionItemsInput: (entry.actionItems || []).join(', '),
    notes: entry.notes || '',
  };
};

const scoreKeys = [
  ['coding', 'Coding'],
  ['problemSolving', 'Problem Solving'],
  ['systemDesign', 'System Design'],
  ['communication', 'Communication'],
  ['behavioral', 'Behavioral'],
];

function MockLogForm({ entry, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(buildInitialForm(entry));

  const title = useMemo(() => (entry ? 'Edit Mock Log' : 'Log New Mock'), [entry]);

  useEffect(() => {
    setForm(buildInitialForm(entry));
  }, [entry]);

  const setSectionScore = (key, value) => {
    setForm((prev) => ({
      ...prev,
      sectionScores: {
        ...prev.sectionScores,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      title: form.title,
      dateKey: form.dateKey,
      format: form.format,
      interviewerType: form.interviewerType,
      overallScore: Number(form.overallScore) || 0,
      sectionScores: Object.entries(form.sectionScores).reduce((acc, [key, value]) => {
        acc[key] = Number(value) || 0;
        return acc;
      }, {}),
      confidenceBefore: Number(form.confidenceBefore) || 0,
      confidenceAfter: Number(form.confidenceAfter) || 0,
      durationMinutes: Number(form.durationMinutes) || 0,
      strengths: form.strengthsInput.split(',').map((x) => x.trim()).filter(Boolean),
      weaknesses: form.weaknessesInput.split(',').map((x) => x.trim()).filter(Boolean),
      actionItems: form.actionItemsInput.split(',').map((x) => x.trim()).filter(Boolean),
      notes: form.notes,
    };

    onSubmit(payload);
  };

  return (
    <section className="panel mock-form-panel">
      <div className="panel__head">
        <h2>{title}</h2>
        <p>Track mock scores, weaknesses, and improvement actions</p>
      </div>

      <form className="mock-form" onSubmit={handleSubmit}>
        <label htmlFor="mock-title">Title</label>
        <input
          id="mock-title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
          minLength={3}
        />

        <div className="mock-grid-two">
          <div>
            <label htmlFor="mock-date">Date</label>
            <input
              id="mock-date"
              type="date"
              value={form.dateKey}
              onChange={(event) => setForm((prev) => ({ ...prev, dateKey: event.target.value }))}
              required
            />
          </div>

          <div>
            <label htmlFor="mock-overall-score">Overall Score</label>
            <input
              id="mock-overall-score"
              type="number"
              min="0"
              max="100"
              value={form.overallScore}
              onChange={(event) => setForm((prev) => ({ ...prev, overallScore: event.target.value }))}
              required
            />
          </div>
        </div>

        <div className="mock-grid-two">
          <div>
            <label htmlFor="mock-format">Format</label>
            <select
              id="mock-format"
              value={form.format}
              onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value }))}
            >
              <option value="mixed">Mixed</option>
              <option value="dsa">DSA</option>
              <option value="system_design">System Design</option>
              <option value="behavioral">Behavioral</option>
            </select>
          </div>

          <div>
            <label htmlFor="mock-interviewer">Interviewer Type</label>
            <select
              id="mock-interviewer"
              value={form.interviewerType}
              onChange={(event) => setForm((prev) => ({ ...prev, interviewerType: event.target.value }))}
            >
              <option value="self">Self</option>
              <option value="peer">Peer</option>
              <option value="mentor">Mentor</option>
              <option value="ai">AI</option>
              <option value="panel">Panel</option>
            </select>
          </div>
        </div>

        <div className="mock-grid-two">
          <div>
            <label htmlFor="mock-duration">Duration (minutes)</label>
            <input
              id="mock-duration"
              type="number"
              min="0"
              value={form.durationMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
            />
          </div>

          <div className="mock-grid-two-inner">
            <div>
              <label htmlFor="mock-confidence-before">Confidence Before (0-10)</label>
              <input
                id="mock-confidence-before"
                type="number"
                min="0"
                max="10"
                value={form.confidenceBefore}
                onChange={(event) => setForm((prev) => ({ ...prev, confidenceBefore: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="mock-confidence-after">Confidence After (0-10)</label>
              <input
                id="mock-confidence-after"
                type="number"
                min="0"
                max="10"
                value={form.confidenceAfter}
                onChange={(event) => setForm((prev) => ({ ...prev, confidenceAfter: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <h3 className="mock-subheading">Section Scores</h3>
        <div className="mock-sections-grid">
          {scoreKeys.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`score-${key}`}>{label}</label>
              <input
                id={`score-${key}`}
                type="number"
                min="0"
                max="100"
                value={form.sectionScores[key]}
                onChange={(event) => setSectionScore(key, event.target.value)}
              />
            </div>
          ))}
        </div>

        <label htmlFor="mock-strengths">Strengths (comma separated)</label>
        <input
          id="mock-strengths"
          value={form.strengthsInput}
          onChange={(event) => setForm((prev) => ({ ...prev, strengthsInput: event.target.value }))}
        />

        <label htmlFor="mock-weaknesses">Weaknesses (comma separated)</label>
        <input
          id="mock-weaknesses"
          value={form.weaknessesInput}
          onChange={(event) => setForm((prev) => ({ ...prev, weaknessesInput: event.target.value }))}
        />

        <label htmlFor="mock-actions">Action Items (comma separated)</label>
        <input
          id="mock-actions"
          value={form.actionItemsInput}
          onChange={(event) => setForm((prev) => ({ ...prev, actionItemsInput: event.target.value }))}
        />

        <label htmlFor="mock-notes">Notes</label>
        <textarea
          id="mock-notes"
          rows={4}
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />

        <div className="mock-form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Mock'}
          </button>
          <button type="button" className="button ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default MockLogForm;
