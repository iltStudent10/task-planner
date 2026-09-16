import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, token, logout } = useAuth();

  return (
    <nav className="app-nav">
      <div className="app-nav__links">
        <Link to="/">Dashboard</Link>
        <Link to="/tasks">Tasks</Link>
        <Link to="/tasks/new">Create task</Link>
      </div>

      <div className="app-nav__actions">
        {token ? (
          <>
            <span className="app-nav__user">{user?.name || user?.email || 'Signed in'}</span>
            <button className="button button--ghost" type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
}