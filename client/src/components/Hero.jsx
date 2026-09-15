export default function Hero({ summary, totalTasks, completedTasks, openTasks }) {
  return (
    <header className="hero">
      <div>
        <span className="badge">Task Manager</span>
        <h1>Plan your day.</h1>
        <p>
          A simple, polished task manager for daily life. Track groceries, cooking, errands, and anything else you want to get done.
        </p>
      </div>
      <div className="hero-metrics">
        <div>
          <strong>{summary?.totalTasks ?? totalTasks}</strong>
          <span>Total tasks</span>
        </div>
        <div>
          <strong>{summary?.completedTasks ?? completedTasks}</strong>
          <span>Done</span>
        </div>
        <div>
          <strong>{summary?.openTasks ?? openTasks}</strong>
          <span>Open</span>
        </div>
      </div>
    </header>
  );
}
