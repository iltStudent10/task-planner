export default function Hero({ user, onLogout, badgeLabel = 'Policy Claims Tracker', title, description, metrics = [] }) {
  return (
    <header className="hero">
      <div>
        <span className="badge">{badgeLabel}</span>
        <h1>{title || (user?.name ? `Welcome, ${user.name}.` : 'Policy Claims Tracker')}</h1>
        <p>{description || 'Track policies, claims, and dashboard activity from one protected workspace.'}</p>
        {user ? (
          <div className="hero__account">
            <span>{user.email}</span>
            <span>{user.role}</span>
          </div>
        ) : null}
      </div>
      <div className="hero__aside">
        <div className="hero-metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
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
