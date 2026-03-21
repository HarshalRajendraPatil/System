import { useState } from 'react';

function LLDHLDSearch({ filters, onFilterChange }) {
  const [searchText, setSearchText] = useState('');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    onFilterChange('search', value || undefined);
  };

  const handleCompletionFilter = (e) => {
    const value = e.target.value;
    onFilterChange(
      'isCompleted',
      value === 'all' ? undefined : value === 'completed' ? true : false,
    );
  };

  const handleCategoryFilter = (e) => {
    const value = e.target.value;
    onFilterChange('category', value || undefined);
  };

  const handleDesignTypeFilter = (e) => {
    const value = e.target.value;
    onFilterChange('designType', value || undefined);
  };

  const handleDifficultyFilter = (e) => {
    const value = e.target.value;
    onFilterChange('difficulty', value || undefined);
  };

  const handleClearFilters = () => {
    setSearchText('');
    onFilterChange('search', undefined);
    onFilterChange('isCompleted', undefined);
    onFilterChange('category', undefined);
    onFilterChange('designType', undefined);
    onFilterChange('difficulty', undefined);
    onFilterChange('tag', undefined);
  };

  const hasActiveFilters =
    searchText ||
    filters.isCompleted !== undefined ||
    filters.category ||
    filters.designType ||
    filters.difficulty;

  return (
    <div className="lld-hld-search">
      <div className="search-input-group">
        <input
          type="text"
          value={searchText}
          onChange={handleSearchChange}
          placeholder="Search designs by title, content, or description..."
          className="search-input"
        />
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label>Status:</label>
          <select onChange={handleCompletionFilter} defaultValue="all">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select onChange={handleDesignTypeFilter} defaultValue="">
            <option value="">All Types</option>
            <option value="LLD">LLD</option>
            <option value="HLD">HLD</option>
            <option value="Both">Both</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select onChange={handleCategoryFilter} defaultValue="">
            <option value="">All Categories</option>
            <option value="System Design">System Design</option>
            <option value="Database Design">Database Design</option>
            <option value="API Design">API Design</option>
            <option value="Architecture">Architecture</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Difficulty:</label>
          <select onChange={handleDifficultyFilter} defaultValue="">
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button className="btn-clear-filters" onClick={handleClearFilters}>
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

export default LLDHLDSearch;
