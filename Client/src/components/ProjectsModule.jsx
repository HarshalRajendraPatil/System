import { useEffect, useMemo, useState } from 'react';
import {
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_LOCAL_EVENT,
} from '../constants/realtime';
import {
  createProject,
  deleteProject,
  getProjectMetrics,
  getProjectsKanban,
  moveProjectStatus,
  updateProject,
} from '../api/projectApi';
import ProjectForm from './ProjectForm';
import ProjectMetricsPanel from './ProjectMetricsPanel';
import ProjectsBoard from './ProjectsBoard';

function ProjectsModule() {
  const [kanban, setKanban] = useState({ columns: {}, summary: null });
  const [metrics, setMetrics] = useState(null);
  const [filters, setFilters] = useState({ search: '', priority: '', tag: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const activeFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      priority: filters.priority || undefined,
      tag: filters.tag || undefined,
    }),
    [filters],
  );

  const fetchBoard = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getProjectsKanban(activeFilters);
      setKanban({
        columns: data.columns || {},
        summary: data.summary || null,
      });
    } catch (requestError) {
      setError(requestError.message || 'Unable to load projects board');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const data = await getProjectMetrics();
      setMetrics(data);
    } catch {
      // Metrics should not block board rendering.
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [activeFilters]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event.detail || {};

      if (
        detail.event === REALTIME_EVENTS.DOMAIN_UPDATED
        && detail.payload?.domain === REALTIME_DOMAINS.PROJECTS
      ) {
        setStatusMessage(detail.payload?.message || 'Live sync: Projects updated on another device.');
        refreshAll();
      }
    };

    window.addEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_LOCAL_EVENT, handleRealtime);
  });

  const refreshAll = async () => {
    await Promise.all([fetchBoard(), fetchMetrics()]);
  };

  const onSaveProject = async (payload) => {
    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      if (editingProject?._id) {
        await updateProject(editingProject._id, payload);
        setStatusMessage('Project updated successfully.');
      } else {
        await createProject(payload);
        setStatusMessage('Project created successfully.');
      }

      setFormOpen(false);
      setEditingProject(null);
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save project');
    } finally {
      setSaving(false);
    }
  };

  const onMoveProject = async (projectId, toStatus) => {
    setMoving(true);
    setError('');
    setStatusMessage('');

    try {
      await moveProjectStatus(projectId, {
        toStatus,
        note: 'Moved from Kanban board',
        kanbanPosition: Date.now(),
      });

      setStatusMessage(`Project moved to ${toStatus.replace('_', ' ')}.`);
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to move project');
    } finally {
      setMoving(false);
    }
  };

  const onDeleteProject = async (projectId) => {
    const confirmed = window.confirm('Delete this project permanently?');
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setStatusMessage('');

    try {
      await deleteProject(projectId);
      setStatusMessage('Project deleted successfully.');
      await refreshAll();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="projects-module">
      <div className="projects-toolbar panel">
        <div className="panel__head">
          <h2>Projects Workspace</h2>
          <p>Kanban flow with measurable impact tracking</p>
        </div>

        <div className="projects-toolbar-controls">
          <input
            type="text"
            placeholder="Search projects, tags, or descriptions"
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                search: event.target.value,
              }))
            }
          />

          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                priority: event.target.value,
              }))
            }
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input
            type="text"
            placeholder="Filter by tag"
            value={filters.tag}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                tag: event.target.value,
              }))
            }
          />

          <button
            type="button"
            className="button"
            onClick={() => {
              setEditingProject(null);
              setFormOpen((prev) => !prev);
            }}
          >
            {formOpen ? 'Close Form' : '+ New Project'}
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}
      </div>

      {formOpen ? (
        <ProjectForm
          project={editingProject}
          onSave={onSaveProject}
          onCancel={() => {
            setFormOpen(false);
            setEditingProject(null);
          }}
          saving={saving}
        />
      ) : null}

      <ProjectMetricsPanel metrics={metrics} summary={kanban.summary} />

      {loading ? (
        <p className="loading">Loading projects board...</p>
      ) : (
        <ProjectsBoard
          columns={kanban.columns}
          moving={moving}
          onMove={onMoveProject}
          onDelete={onDeleteProject}
          onEdit={(project) => {
            setEditingProject(project);
            setFormOpen(true);
          }}
        />
      )}
    </section>
  );
}

export default ProjectsModule;
