import { formatNumber } from '../utils/formatting';

function PaginationControls({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination-controls">
      <span className="pagination-summary">
        Showing {formatNumber(start)}-{formatNumber(end)} of {formatNumber(totalItems)}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="button ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span className="pagination-page">{formatNumber(page)}/{formatNumber(totalPages)}</span>
        <button
          type="button"
          className="button ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default PaginationControls;
