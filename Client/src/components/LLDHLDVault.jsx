import { useEffect, useState } from 'react';
import {
  getLLDHLDDesigns,
  createLLDHLDDesign,
  deleteLLDHLDDesign,
  getLLDHLDStats,
  toggleLLDHLDCompletion,
} from '../api/lldHldApi';
import LLDHLDSearch from './LLDHLDSearch';
import LLDHLDList from './LLDHLDList';
import LLDHLDEditor from './LLDHLDEditor';
import LLDHLDStats from './LLDHLDStats';

function LLDHLDVault() {
  const [designs, setDesigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);

  const [filters, setFilters] = useState({
    isCompleted: undefined,
    category: undefined,
    designType: undefined,
    difficulty: undefined,
    tag: undefined,
    search: undefined,
  });

  const fetchDesigns = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getLLDHLDDesigns({
        ...filters,
      });

      setDesigns(result.designs || []);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await getLLDHLDStats();
      setStats(statsData);
    } catch (requestError) {
      console.error('Failed to load stats:', requestError);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCreateDesign = async (designData) => {
    setSaving(true);
    setError('');

    try {
      await createLLDHLDDesign({
        ...designData,
      });

      setShowEditor(false);
      setEditingDesign(null);
      await fetchDesigns();
      await fetchStats();
    } catch (requestError) {
      setError(requestError.message || 'Failed to create design');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDesign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this design?')) return;

    setSaving(true);
    setError('');

    try {
      await deleteLLDHLDDesign(id);
      await fetchDesigns();
      await fetchStats();
    } catch (requestError) {
      setError(requestError.message || 'Failed to delete design');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompletion = async (id) => {
    setSaving(true);

    try {
      await toggleLLDHLDCompletion(id);
      await fetchDesigns();
      await fetchStats();
    } catch (requestError) {
      setError(requestError.message || 'Failed to update design');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel lld-hld-section">
      <div className="panel__head">
        <h2>LLD/HLD Design Vault</h2>
        <p>Design patterns, system architecture, and low-level/high-level designs</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {stats && <LLDHLDStats stats={stats} />}

      <div className="lld-hld-controls">
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingDesign(null);
            setShowEditor(!showEditor);
          }}
          disabled={saving}
        >
          {showEditor ? 'Cancel' : '+ Add Design'}
        </button>
      </div>

      {showEditor && (
        <LLDHLDEditor
          design={editingDesign}
          onSave={handleCreateDesign}
          onCancel={() => {
            setShowEditor(false);
            setEditingDesign(null);
          }}
          isSaving={saving}
        />
      )}

      <LLDHLDSearch filters={filters} onFilterChange={handleFilterChange} />

      <LLDHLDList
        designs={designs}
        isLoading={loading}
        onDelete={handleDeleteDesign}
        onToggleCompletion={handleToggleCompletion}
        filters={filters}
      />
    </section>
  );
}

export default LLDHLDVault;
