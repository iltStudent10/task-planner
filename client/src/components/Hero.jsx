export default function Hero({ summary, totalTasks, completedTasks, openTasks, user, onLogout }) {
  return (
    <header className="hero">
      <div>
        <span className="badge">Task Manager</span>
        <h1>{user?.name ? `Welcome, ${user.name}.` : 'Plan your day.'}</h1>
        <p>
          A simple, polished task manager for daily life. Track groceries, cooking, errands, and anything else you want to get done.
        </p>
        {user ? (
          <div className="hero__account">
            <span>{user.email}</span>
            <span>{user.role}</span>
          </div>
        ) : null}
      </div>
      <div className="hero__aside">
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
        {onLogout ? (
          <button className="button button--ghost" type="button" onClick={onLogout}>
            Log out
          </button>
        ) : null}
      </div>
    </header>
  );
}
