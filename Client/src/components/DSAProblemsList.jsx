import { useEffect, useMemo, useState } from 'react';
import PaginationControls from './PaginationControls';

function DSAProblemsList({ problems, isLoading, onDelete, filters, onFilterChange }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil((problems || []).length / pageSize));
  const pagedProblems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (problems || []).slice(start, start + pageSize);
  }, [problems, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return <p className="loading">Loading DSA problems...</p>;
  }

  return (
    <section className="panel dsa-list-section">
      <div className="panel__head">
        <h2>Problems Solved</h2>
        <p>{problems.length} problems logged</p>
      </div>

      <div className="dsa-filters">
        <select
          value={filters.difficulty || ''}
          onChange={(e) => onFilterChange('difficulty', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={filters.platform || ''}
          onChange={(e) => onFilterChange('platform', e.target.value || undefined)}
          className="filter-select"
        >
          <option value="">All Platforms</option>
          <option value="LeetCode">LeetCode</option>
          <option value="Codeforces">Codeforces</option>
          <option value="HackerRank">HackerRank</option>
          <option value="InterviewBit">InterviewBit</option>
          <option value="GeeksforGeeks">GeeksforGeeks</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {problems.length ? (
        <>
          <div className="problems-table">
          <div className="table-header">
            <span>Problem</span>
            <span>Difficulty</span>
            <span>Platform</span>
            <span>XP</span>
            <span>Date</span>
            <span>Action</span>
          </div>

          {pagedProblems.map((problem) => (
            <div key={problem._id} className="table-row">
              <span className="problem-title">
                {problem.link ? (
                  <a href={problem.link} target="_blank" rel="noopener noreferrer">
                    {problem.title}
                  </a>
                ) : (
                  problem.title
                )}
              </span>
              <span className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>
              <span className="platform">{problem.platform}</span>
              <strong className="xp">{problem.xpEarned} XP</strong>
              <span className="date">
                {new Date(`${problem.dateCompletedKey}T00:00:00Z`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <button
                type="button"
                className="btn-delete"
                onClick={() => onDelete(problem._id)}
                title="Delete problem"
              >
                ✕
              </button>
            </div>
          ))}
          </div>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={problems.length}
            pageSize={pageSize}
            onPageChange={(next) => setPage(Math.min(totalPages, Math.max(1, next)))}
          />
        </>
      ) : (
        <p className="empty-text">No problems logged yet. Start by logging your first problem!</p>
      )}
    </section>
  );
}

export default DSAProblemsList;
