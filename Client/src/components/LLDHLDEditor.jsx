import { useState } from 'react';

function LLDHLDEditor({ design, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    title: design?.title || '',
    designType: design?.designType || 'Both',
    category: design?.category || 'Other',
    difficulty: design?.difficulty || 'Medium',
    description: design?.description || '',
    content: design?.content || '',
    tags: design?.tags?.join(', ') || '',
    resources: design?.resources || [],
    notes: design?.notes || '',
  });

  const [tagInput, setTagInput] = useState('');
  const [resourceInput, setResourceInput] = useState({ title: '', url: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const tags = formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [];
      tags.push(tagInput.trim());
      setFormData((prev) => ({
        ...prev,
        tags: tags.join(', '),
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (index) => {
    const tags = formData.tags.split(',').map((t) => t.trim());
    tags.splice(index, 1);
    setFormData((prev) => ({
      ...prev,
      tags: tags.join(', '),
    }));
  };

  const handleAddResource = () => {
    if (resourceInput.title.trim() && resourceInput.url.trim()) {
      setFormData((prev) => ({
        ...prev,
        resources: [...(prev.resources || []), { ...resourceInput }],
      }));
      setResourceInput({ title: '', url: '' });
    }
  };

  const handleRemoveResource = (index) => {
    setFormData((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (!formData.content.trim()) {
      alert('Content is required');
      return;
    }

    const tagsArray = formData.tags
      ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    onSave({
      title: formData.title,
      designType: formData.designType,
      category: formData.category,
      difficulty: formData.difficulty,
      description: formData.description,
      content: formData.content,
      tags: tagsArray,
      resources: formData.resources || [],
      notes: formData.notes,
    });
  };

  return (
    <div className="lld-hld-editor-modal">
      <div className="editor-container">
        <h3>Create LLD/HLD Design</h3>

        <form onSubmit={handleSubmit} className="editor-form">
          {/* Basic Info */}
          <div className="form-section">
            <h4>Basic Information</h4>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter design title"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the design"
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Design Type</label>
                <select name="designType" value={formData.designType} onChange={handleChange}>
                  <option value="LLD">LLD (Low-Level Design)</option>
                  <option value="HLD">HLD (High-Level Design)</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div className="form-group half">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                  <option value="System Design">System Design</option>
                  <option value="Database Design">Database Design</option>
                  <option value="API Design">API Design</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select name="difficulty" value={formData.difficulty} onChange={handleChange}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="form-section">
            <h4>Design Content (Markdown)</h4>

            <div className="form-group">
              <label>Content *</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Enter your design in markdown format..."
                rows={10}
                required
              />
              <small>Supports markdown formatting (##, -, *, etc.)</small>
            </div>
          </div>

          {/* Tags */}
          <div className="form-section">
            <h4>Tags</h4>

            <div className="form-group">
              <label>Add Tags</label>
              <div className="tag-input-group">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Enter tag and press Enter"
                />
                <button type="button" onClick={handleAddTag} className="btn-secondary">
                  Add Tag
                </button>
              </div>

              {formData.tags && (
                <div className="tags-display">
                  {formData.tags.split(',').map((tag, index) => (
                    <span key={index} className="tag">
                      {tag.trim()}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(index)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resources */}
          <div className="form-section">
            <h4>Resources</h4>

            <div className="form-group">
              <label>Add Resources</label>
              <div className="resource-input-group">
                <input
                  type="text"
                  value={resourceInput.title}
                  onChange={(e) => setResourceInput({ ...resourceInput, title: e.target.value })}
                  placeholder="Resource title"
                />
                <input
                  type="url"
                  value={resourceInput.url}
                  onChange={(e) => setResourceInput({ ...resourceInput, url: e.target.value })}
                  placeholder="Resource URL"
                />
                <button type="button" onClick={handleAddResource} className="btn-secondary">
                  Add
                </button>
              </div>

              {formData.resources?.length > 0 && (
                <div className="resources-list">
                  {formData.resources.map((resource, index) => (
                    <div key={index} className="resource-item">
                      <span>
                        <strong>{resource.title}</strong>: <a href={resource.url}>{resource.url}</a>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(index)}
                        className="btn-icon btn-delete-small"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <h4>Additional Notes</h4>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes or thoughts..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Design'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LLDHLDEditor;
