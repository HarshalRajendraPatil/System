import { useState } from 'react';

function DSALogForm({ onSubmit, isSubmitting, defaultValues }) {
  const [form, setForm] = useState(
    defaultValues || {
      title: '',
      difficulty: 'Easy',
      platform: 'LeetCode',
      link: '',
      dateCompletedKey: new Date().toISOString().split('T')[0],
      notes: '',
      tags: '',
    },
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="dsa-form">
      <div className="form-row">
        <label className="form-field">
          <span>Problem Title*</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Two Sum, Longest Substring Without Repeating"
            required
          />
        </label>

        <label className="form-field">
          <span>Difficulty*</span>
          <select value={form.difficulty} onChange={(e) => handleChange('difficulty', e.target.value)}>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>Platform</span>
          <select value={form.platform} onChange={(e) => handleChange('platform', e.target.value)}>
            <option value="LeetCode">LeetCode</option>
            <option value="Codeforces">Codeforces</option>
            <option value="HackerRank">HackerRank</option>
            <option value="InterviewBit">InterviewBit</option>
            <option value="GeeksforGeeks">GeeksforGeeks</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="form-field">
          <span>Date Completed</span>
          <input
            type="date"
            value={form.dateCompletedKey}
            onChange={(e) => handleChange('dateCompletedKey', e.target.value)}
          />
        </label>
      </div>

      <label className="form-field">
        <span>Problem Link</span>
        <input
          type="url"
          value={form.link}
          onChange={(e) => handleChange('link', e.target.value)}
          placeholder="https://leetcode.com/problems/two-sum"
        />
      </label>

      <label className="form-field">
        <span>Tags (comma-separated)</span>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          placeholder="array, hash-table, two-pointer"
        />
      </label>

      <label className="form-field">
        <span>Notes</span>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Your approach, lessons learned, edge cases..."
          rows="3"
        />
      </label>

      <button type="submit" className="button" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Log Problem'}
      </button>
    </form>
  );
}

export default DSALogForm;
