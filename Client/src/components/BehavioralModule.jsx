import { useEffect, useMemo, useState } from 'react';
import {
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_LOCAL_EVENT,
} from '../constants/realtime';
import {
  createBehavioralStory,
  deleteBehavioralStory,
  getBehavioralAnalyticsOverview,
  getBehavioralRandomPractice,
  getBehavioralStories,
  logBehavioralPractice,
  updateBehavioralStory,
} from '../api/behavioralApi';
import BehavioralAnalyticsPanel from './BehavioralAnalyticsPanel';
import BehavioralPracticePanel from './BehavioralPracticePanel';
import BehavioralStoryForm from './BehavioralStoryForm';
import BehavioralStoryList from './BehavioralStoryList';

function BehavioralModule() {
  const [stories, setStories] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [randomStory, setRandomStory] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    competency: '',
    tag: '',
    difficulty: '',
    outcome: '',
    favorite: '',
    sortBy: 'updated_desc',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [practiceLogging, setPracticeLogging] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState(null);

  const activeFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      competency: filters.competency || undefined,
      tag: filters.tag || undefined,
      difficulty: filters.difficulty || undefined,
      outcome: filters.outcome || undefined,
      favorite: filters.favorite || undefined,
      sortBy: filters.sortBy || undefined,
      limit: 400,
    }),
    [filters],
  );

  const fetchStories = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getBehavioralStories(activeFilters);
      setStories(data || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load behavioral stories');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await getBehavioralAnalyticsOverview();
      setAnalytics(data);
    } catch {
      // Analytics should not block the feature.
    }
  };

  useEffect(() => {
    fetchStories();
  }, [activeFilters]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event.detail || {};

      if (
        detail.event === REALTIME_EVENTS.DOMAIN_UPDATED
        && detail.payload?.domain === REALTIME_DOMAINS.BEHAVIORAL
      ) {
        setStatusMessage(detail.payload?.message || 'Live sync: Behavioral workspace updated on another device.');
        refreshAll();
      }
    };

    window.addEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
  });

  const refreshAll = async () => {
    await Promise.all([fetchStories(), fetchAnalytics()]);
  };

  const onSaveStory = async (payload) => {
    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      if (editingStory?._id) {
        await updateBehavioralStory(editingStory._id, payload);
        setStatusMessage('Story updated successfully.');
      } else {
        await createBehavioralStory(payload);
        setStatusMessage('Story created successfully.');
      }

      setShowForm(false);
      setEditingStory(null);
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save story');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteStory = async (id) => {
    if (!window.confirm('Delete this STAR story?')) {
      return;
    }

    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      await deleteBehavioralStory(id);
      if (randomStory?._id === id) {
        setRandomStory(null);
      }
      setStatusMessage('Story deleted successfully.');
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete story');
    } finally {
      setSaving(false);
    }
  };

  const onGenerateRandom = async () => {
    setRandomLoading(true);
    setError('');

    try {
      const data = await getBehavioralRandomPractice({
        difficulty: filters.difficulty || undefined,
        competency: filters.competency || undefined,
        tag: filters.tag || undefined,
        excludeIds: randomStory?._id || undefined,
        unpracticedFirst: true,
      });

      setRandomStory(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate random practice story');
    } finally {
      setRandomLoading(false);
    }
  };

  const onLogPractice = async (storyId, payload) => {
    setPracticeLogging(true);
    setError('');
    setStatusMessage('');

    try {
      const data = await logBehavioralPractice(storyId, payload);
      setRandomStory(data.story || randomStory);
      setStatusMessage('Practice session logged. Keep building fluency.');
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to log practice session');
    } finally {
      setPracticeLogging(false);
    }
  };

  return (
    <section className="behavioral-module">
      <section className="panel behavioral-toolbar">
        <div className="panel__head">
          <h2>Behavioral Interview Workspace</h2>
          <p>STAR storage, smart search, random practice mode, and performance analytics</p>
        </div>

        <div className="behavioral-toolbar-controls">
          <input
            type="text"
            placeholder="Search stories, STAR details, competencies"
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
          />

          <input
            type="text"
            placeholder="Competency"
            value={filters.competency}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, competency: event.target.value }))
            }
          />

          <input
            type="text"
            placeholder="Tag"
            value={filters.tag}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, tag: event.target.value }))
            }
          />

          <select
            value={filters.difficulty}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, difficulty: event.target.value }))
            }
          >
            <option value="">All Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={filters.outcome}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, outcome: event.target.value }))
            }
          >
            <option value="">All Outcomes</option>
            <option value="success">Success</option>
            <option value="mixed">Mixed</option>
            <option value="learning">Learning</option>
          </select>

          <select
            value={filters.favorite}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, favorite: event.target.value }))
            }
          >
            <option value="">All Stories</option>
            <option value="true">Favorites</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, sortBy: event.target.value }))
            }
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="practice_least">Least Practiced</option>
            <option value="practice_most">Most Practiced</option>
            <option value="confidence_desc">Highest Confidence</option>
            <option value="confidence_asc">Lowest Confidence</option>
          </select>

          <button
            type="button"
            className="button"
            onClick={() => {
              if (showForm) {
                setEditingStory(null);
              }
              setShowForm((prev) => !prev);
            }}
          >
            {showForm ? 'Close Form' : '+ New Story'}
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}
      </section>

      {showForm ? (
        <BehavioralStoryForm
          story={editingStory}
          onSave={onSaveStory}
          onCancel={() => {
            setShowForm(false);
            setEditingStory(null);
          }}
          saving={saving}
        />
      ) : null}

      <BehavioralAnalyticsPanel analytics={analytics} />

      <BehavioralPracticePanel
        randomStory={randomStory}
        loading={randomLoading}
        onGenerate={onGenerateRandom}
        onLogPractice={onLogPractice}
        logging={practiceLogging}
      />

      {loading ? (
        <p className="loading">Loading behavioral stories...</p>
      ) : (
        <BehavioralStoryList
          stories={stories}
          onEdit={(story) => {
            setEditingStory(story);
            setShowForm(true);
          }}
          onDelete={onDeleteStory}
        />
      )}
    </section>
  );
}

export default BehavioralModule;
