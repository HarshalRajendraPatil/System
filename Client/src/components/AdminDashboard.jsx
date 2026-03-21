import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  deleteAdminUser,
  getAdminOverview,
  getAdminRecentActivity,
  getAdminUsers,
  updateAdminUser,
} from '../api/adminApi';
import PaginationControls from './PaginationControls';
import { formatNumber } from '../utils/formatting';

const USER_FILTER_OPTIONS = [
  { label: 'All roles', value: '' },
  { label: 'Admins', value: 'admin' },
  { label: 'Users', value: 'user' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All status', value: '' },
  { label: 'Active only', value: 'true' },
  { label: 'Inactive only', value: 'false' },
];

const SORT_OPTIONS = [
  { label: 'Newest first', value: 'createdAt:desc' },
  { label: 'Oldest first', value: 'createdAt:asc' },
  { label: 'XP high to low', value: 'totalXp:desc' },
  { label: 'Level high to low', value: 'level:desc' },
  { label: 'Recent login', value: 'lastLoginAt:desc' },
];

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

function AdminDashboard({ currentUserId = '' }) {
  const [overview, setOverview] = useState(null);
  const [activityResult, setActivityResult] = useState(null);
  const [usersResult, setUsersResult] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortValue, setSortValue] = useState('createdAt:desc');
  const [userPage, setUserPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [savingUserId, setSavingUserId] = useState('');

  const sortConfig = useMemo(() => {
    const [sortBy, sortOrder] = String(sortValue || '').split(':');
    return {
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };
  }, [sortValue]);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await getAdminOverview();
      setOverview(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load admin overview.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const data = await getAdminRecentActivity({
        page: activityPage,
        limit: 10,
      });
      setActivityResult(data || null);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load recent admin activity.');
    } finally {
      setLoadingActivity(false);
    }
  }, [activityPage]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError('');

    try {
      const data = await getAdminUsers({
        page: userPage,
        limit: 12,
        query,
        role: roleFilter,
        isActive: statusFilter,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder,
      });

      setUsersResult(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [query, roleFilter, sortConfig.sortBy, sortConfig.sortOrder, statusFilter, userPage]);

  useEffect(() => {
    loadOverview();
    loadActivity();
  }, [loadActivity, loadOverview]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onApplySearch = (e) => {
    e.preventDefault();
    setUserPage(1);
    setQuery(queryInput.trim());
  };

  const refreshAdminData = async () => {
    await Promise.all([loadOverview(), loadUsers(), loadActivity()]);
  };

  const onRoleToggle = async (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    setSavingUserId(user.id);

    try {
      await updateAdminUser(user.id, { role: nextRole });
      toast.success(`Updated role for ${user.displayName}`);
      await refreshAdminData();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to update role.');
    } finally {
      setSavingUserId('');
    }
  };

  const onStatusToggle = async (user) => {
    const nextStatus = !user.isActive;
    setSavingUserId(user.id);

    try {
      await updateAdminUser(user.id, { isActive: nextStatus });
      toast.success(`Updated status for ${user.displayName}`);
      await refreshAdminData();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to update status.');
    } finally {
      setSavingUserId('');
    }
  };

  const onDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `Delete ${user.displayName} (${user.username}) and all associated data? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setSavingUserId(user.id);

    try {
      await deleteAdminUser(user.id);
      toast.success(`Deleted ${user.displayName} and linked records`);
      await refreshAdminData();
    } catch (requestError) {
      toast.error(requestError.message || 'Unable to delete user.');
    } finally {
      setSavingUserId('');
    }
  };

  return (
    <section className="admin-dashboard">
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Admin Command Center</h2>
          <p>Global visibility, role control, and user lifecycle management.</p>
        </div>

        {loadingOverview || !overview ? (
          <p className="empty-text">Loading platform overview...</p>
        ) : (
          <>
            <div className="stats-grid admin-kpi-grid">
              <article className="card admin-kpi-card">
                <p>Total Users</p>
                <strong>{formatNumber(overview.users.total)}</strong>
                <small>Active: {formatNumber(overview.users.active)}</small>
              </article>
              <article className="card admin-kpi-card">
                <p>Admin Accounts</p>
                <strong>{formatNumber(overview.users.admins)}</strong>
                <small>New (7d): {formatNumber(overview.users.newlyRegisteredInWindow)}</small>
              </article>
              <article className="card admin-kpi-card">
                <p>Total XP</p>
                <strong>{formatNumber(overview.engagement.totalXp)}</strong>
                <small>Avg level: {Number(overview.engagement.averageLevel || 0).toFixed(2)}</small>
              </article>
              <article className="card admin-kpi-card">
                <p>Quests Completed Today</p>
                <strong>{formatNumber(overview.engagement.completedQuestsToday)}</strong>
                <small>Avg streak: {Number(overview.engagement.averageStreak || 0).toFixed(2)}</small>
              </article>
            </div>

            <div className="admin-module-grid">
              {Object.entries(overview.modules).map(([key, value]) => (
                <article key={key} className="card admin-module-card">
                  <p>{key}</p>
                  <strong>{formatNumber(value)}</strong>
                </article>
              ))}
            </div>

            <div className="admin-top-users">
              <h3>Top Users</h3>
              {!overview.topUsers?.length ? (
                <p className="empty-text">No users yet.</p>
              ) : (
                <div className="history-list">
                  {overview.topUsers.map((user) => (
                    <article key={user.id} className="history-row">
                      <span>{user.displayName} (@{user.username})</span>
                      <span>Level {formatNumber(user.level)}</span>
                      <strong>{formatNumber(user.totalXp)} XP</strong>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>User Administration</h2>
          <p>Manage roles, account activation, and data lifecycle.</p>
        </div>

        <form className="admin-filters" onSubmit={onApplySearch}>
          <label>
            Search
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="username, display name, email"
            />
          </label>

          <label>
            Role
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setUserPage(1);
              }}
            >
              {USER_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setUserPage(1);
              }}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort
            <select
              value={sortValue}
              onChange={(e) => {
                setSortValue(e.target.value);
                setUserPage(1);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="button">
            Apply
          </button>
        </form>

        {loadingUsers || !usersResult ? (
          <p className="empty-text">Loading users...</p>
        ) : !usersResult.items?.length ? (
          <p className="empty-text">No users matched your filters.</p>
        ) : (
          <>
            <div className="admin-user-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Footprint</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersResult.items.map((user) => {
                    const isCurrentAdmin = user.id === currentUserId;
                    const isSavingRow = savingUserId === user.id;

                    return (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.displayName}</strong>
                          <p>@{user.username}</p>
                          <p>{user.email || 'No email'}</p>
                        </td>
                        <td>{user.role}</td>
                        <td>{user.isActive ? 'active' : 'inactive'}</td>
                        <td>
                          <p>Level {formatNumber(user.level)}</p>
                          <p>{formatNumber(user.totalXp)} XP</p>
                          <p>Streak {formatNumber(user.currentStreak)}</p>
                        </td>
                        <td>
                          <p>Q: {formatNumber(user.activityFootprint.dailyQuests)}</p>
                          <p>D: {formatNumber(user.activityFootprint.dsaProblems)}</p>
                          <p>M: {formatNumber(user.activityFootprint.mockInterviews)}</p>
                          <p>P: {formatNumber(user.activityFootprint.projects)}</p>
                        </td>
                        <td>{formatDateTime(user.lastLoginAt)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="button ghost"
                              onClick={() => onRoleToggle(user)}
                              disabled={isSavingRow || isCurrentAdmin}
                            >
                              {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                            </button>
                            <button
                              type="button"
                              className="button ghost"
                              onClick={() => onStatusToggle(user)}
                              disabled={isSavingRow || isCurrentAdmin}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              className="button danger"
                              onClick={() => onDeleteUser(user)}
                              disabled={isSavingRow || isCurrentAdmin}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={usersResult.pagination.page}
              totalPages={usersResult.pagination.totalPages}
              totalItems={usersResult.pagination.totalItems}
              pageSize={usersResult.pagination.limit}
              onPageChange={(nextPage) => {
                if (nextPage < 1 || nextPage > usersResult.pagination.totalPages) {
                  return;
                }

                setUserPage(nextPage);
              }}
            />
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Recent Platform Activity</h2>
          <p>Latest cross-module actions from all users.</p>
        </div>

        {loadingActivity ? (
          <p className="empty-text">Loading activity feed...</p>
        ) : !activityResult?.items?.length ? (
          <p className="empty-text">No activity captured yet.</p>
        ) : (
          <>
            <div className="history-list">
              {activityResult.items.map((event) => (
                <article key={`${event.domain}-${event.id}`} className="history-row">
                  <span>
                    [{event.domain}] {event.user.displayName} (@{event.user.username})
                  </span>
                  <span>{event.summary.title}</span>
                  <strong>{formatDateTime(event.createdAt)}</strong>
                </article>
              ))}
            </div>
            <PaginationControls
              page={activityResult.pagination.page}
              totalPages={activityResult.pagination.totalPages}
              totalItems={activityResult.pagination.totalItems}
              pageSize={activityResult.pagination.limit}
              onPageChange={(nextPage) => {
                if (nextPage < 1 || nextPage > activityResult.pagination.totalPages) {
                  return;
                }

                setActivityPage(nextPage);
              }}
            />
          </>
        )}
      </section>
    </section>
  );
}

export default AdminDashboard;
