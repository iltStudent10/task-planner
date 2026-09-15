export default function TaskFilters({ search, filter, onSearchChange, onFilterChange }) {
  return (
    <article className="panel">
      <h2>Filters</h2>
      <div className="filters">
        <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search tasks" />
        <select value={filter} onChange={(e) => onFilterChange(e.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </article>
  );
}
