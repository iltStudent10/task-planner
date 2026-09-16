import { useEffect, useState } from 'react';
import Hero from './components/Hero';
import AuthForm from './components/AuthForm';
import TaskForm from './components/TaskForm';
import TaskFilters from './components/TaskFilters';
import TaskList from './components/TaskList';
import ErrorAlert from './components/ErrorAlert';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { parseJsonResponse, requestJson } from './api';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const blankForm = {
  title: '',
  category: 'Personal',
  priority: 'medium',
  dueDate: '',
  notes: '',
};

const blankAuthForm = {
  name: '',
  email: '',
  password: '',
};

const blankFormErrors = {
  title: '',
  category: '',
  priority: '',
  dueDate: '',
  notes: '',
};

const blankAuthErrors = {
  name: '',
  email: '',
  password: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeError = async (response, fallbackMessage) => {
  try {
    const body = await response.json();
    return body?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const validateTaskForm = (value) => {
  const errors = { ...blankFormErrors };

  if (!String(value.title || '').trim()) {
    errors.title = 'Task title is required.';
  } else if (String(value.title).trim().length < 3) {
    errors.title = 'Task title must be at least 3 characters.';
  } else if (String(value.title).trim().length > 80) {
    errors.title = 'Task title must be 80 characters or fewer.';
  }

  if (value.category && String(value.category).trim().length > 40) {
    errors.category = 'Category must be 40 characters or fewer.';
  }

  if (!['low', 'medium', 'high'].includes(value.priority)) {
    errors.priority = 'Choose a valid priority.';
  }

  if (value.dueDate && String(value.dueDate).trim().length > 40) {
    errors.dueDate = 'Due date must be 40 characters or fewer.';
  }

  if (value.notes && String(value.notes).trim().length > 300) {
    errors.notes = 'Notes must be 300 characters or fewer.';
  }

  return errors;
};

const validateAuthForm = (mode, value) => {
  const errors = { ...blankAuthErrors };

  if (mode === 'register') {
    if (!String(value.name || '').trim()) {
      errors.name = 'Name is required.';
    } else if (String(value.name).trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (String(value.name).trim().length > 50) {
      errors.name = 'Name must be 50 characters or fewer.';
    }
  }

  if (!String(value.email || '').trim()) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(String(value.email).trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!String(value.password || '')) {
    errors.password = 'Password is required.';
  } else if (String(value.password).length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
};

const hasErrors = (errors) => Object.values(errors).some(Boolean);

export default function App() {
  const { user, token, login, logout, isBootstrapping } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [authForm, setAuthForm] = useState(blankAuthForm);
  const [authMode, setAuthMode] = useState('login');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [taskErrors, setTaskErrors] = useState(blankFormErrors);
  const [authErrors, setAuthErrors] = useState(blankAuthErrors);
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimDetail, setClaimDetail] = useState(null);
  const [claimDetailLoading, setClaimDetailLoading] = useState(false);
  const [claimDetailError, setClaimDetailError] = useState('');

  const clearSession = (message = '') => {
    setSummary(null);
    setTasks([]);
    setPolicies([]);
    setClaims([]);
    setClaimDetail(null);
    setClaimDetailError('');
    setForm(blankForm);
    setTaskErrors(blankFormErrors);
    setAuthErrors(blankAuthErrors);
    logout();
    if (message) {
      setError(message);
    }
  };

  const authFetch = async (url, options = {}, token) => {
    const response = await requestJson(url, { ...options, token, auth: true });

    if (response.status === 401) {
      clearSession('Your session expired. Please log in again.');
      throw new Error('Authentication required');
    }

    return response;
  };

  const loadData = async (authToken = token) => {
    try {
      if (!authToken) {
        setSummary(null);
        setTasks([]);
        setPolicies([]);
        setClaims([]);
        return;
      }

      const [summaryRes, tasksRes, policiesRes, claimsRes] = await Promise.all([
        authFetch('/api/dashboard', {}, authToken),
        authFetch('/api/tasks', {}, authToken),
        authFetch('/api/policies', {}, authToken),
        authFetch('/api/claims', {}, authToken),
      ]);

      if (!summaryRes.ok || !tasksRes.ok || !policiesRes.ok || !claimsRes.ok) {
        throw new Error('API request failed');
      }

      const summaryJson = await parseJsonResponse(summaryRes);
      const tasksJson = await parseJsonResponse(tasksRes);
      const policiesJson = await parseJsonResponse(policiesRes);
      const claimsJson = await parseJsonResponse(claimsRes);
      setSummary(summaryJson);
      setTasks(tasksJson.tasks || []);
      setPolicies(policiesJson.policies || []);
      setClaims(claimsJson.claims || []);
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to load dashboard data');
      }
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setTaskErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleAuthModeChange = (nextMode) => {
    setAuthMode(nextMode);
    setAuthForm((current) => (nextMode === 'login' ? { ...current, name: '' } : current));
    setAuthErrors(blankAuthErrors);
    setError('');
  };

  const handleSignOut = () => {
    clearSession();
    setError('');
  };

  const copyAccessToken = async () => {
    if (!token) {
      setError('No access token is available.');
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      setError('Access token copied. Paste it into Postman as Bearer token.');
    } catch {
      setError('Unable to copy token automatically. You can copy it from local storage/session state.');
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    const nextErrors = validateAuthForm(authMode, authForm);
    setAuthErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setAuthBusy(true);
    setError('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        authMode === 'register'
          ? { name: authForm.name, email: authForm.email, password: authForm.password }
          : { email: authForm.email, password: authForm.password };

      const response = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to authenticate'));
      }

      const data = await parseJsonResponse(response);
      const nextSession = { token: data.token, user: data.user };
      login(nextSession);
      setAuthForm(blankAuthForm);
      await loadData(nextSession.token);
    } catch (err) {
      setError(err.message || 'Unable to authenticate');
    } finally {
      setAuthBusy(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    const nextErrors = validateTaskForm(form);
    setTaskErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setError('Please fix the highlighted task fields.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(form),
      }, token);

      if (!res.ok) {
        throw new Error(await normalizeError(res, 'Unable to create task'));
      }

      setForm(blankForm);
      setTaskErrors(blankFormErrors);
      await loadData(token);
    } catch (err) {
      setError(err.message || 'Unable to create task');
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task) => {
    try {
        await authFetch(
        `/api/tasks/${task.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ completed: !task.completed }),
        },
          token,
      );
      await loadData(token);
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to update task');
      }
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await authFetch(`/api/tasks/${taskId}`, { method: 'DELETE' }, token);
      await loadData(token);
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to delete task');
      }
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const searchHit = [task.title, task.category, task.notes, task.dueDate].join(' ').toLowerCase().includes(search.toLowerCase());
    const statusHit = filter === 'all' || (filter === 'completed' ? task.completed : !task.completed);
    return searchHit && statusHit;
  });

  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;

  const loadClaimDetail = async (claimId) => {
      if (!token) {
      return null;
    }

    setClaimDetailLoading(true);
    setClaimDetailError('');

    try {
      const response = await authFetch(`/api/claims/${claimId}`, {}, token);
      if (!response.ok) {
        throw new Error('Unable to load claim');
      }

      const body = await parseJsonResponse(response);
      setClaimDetail(body.claim || null);
      return body.claim || null;
    } catch (err) {
      setClaimDetailError(err.message || 'Unable to load claim');
      return null;
    } finally {
      setClaimDetailLoading(false);
    }
  };

  const ProtectedFrame = ({ children }) => (
    <div className="page">
      <Navbar onCopyToken={copyAccessToken} />
      {children}
    </div>
  );

  const AuthScreen = ({ mode }) => {
    const title = mode === 'login' ? 'Welcome back' : 'Create your account';
    const message = mode === 'login'
      ? 'Log in to access your dashboard, policies, and claims.'
      : 'Register to create your account and start tracking your work.';

    return (
      <div className="page auth-page">
        <section className="auth-hero">
          <span className="badge">Task Manager</span>
          <h1>{title}</h1>
          <p>{message}</p>
        </section>

        <ErrorAlert message={error} />

        <AuthForm
          mode={mode}
          form={authForm}
          submitting={authBusy}
          errors={authErrors}
          onChange={handleAuthChange}
          onModeChange={handleAuthModeChange}
          onSubmit={submitAuth}
        />
      </div>
    );
  };

  const ClaimsScreen = () => (
    <ProtectedFrame>
      <header className="section-header">
        <div>
          <span className="badge">Claims</span>
          <h1>Claims</h1>
        </div>
      </header>

      <section className="grid grid--single">
        <article className="panel panel--wide">
          <h2>All claims</h2>
          <div className="cards cards--stacked">
            {claims.map((claim) => (
              <Link key={claim.id} to={`/claims/${claim.id}`} className="card card--link">
                <h3>{claim.claimNumber}</h3>
                <p>{claim.description}</p>
                <div className="task-meta">
                  <span>{claim.status}</span>
                  <span>{claim.policy}</span>
                  <span>${Number(claim.amount || 0).toFixed(2)}</span>
                </div>
              </Link>
            ))}
            {!claims.length ? <div className="empty">No claims available.</div> : null}
          </div>
        </article>
      </section>
    </ProtectedFrame>
  );

  const PoliciesScreen = () => (
    <ProtectedFrame>
      <header className="section-header">
        <div>
          <span className="badge">Policies</span>
          <h1>Policies</h1>
        </div>
      </header>

      <section className="grid grid--single">
        <article className="panel panel--wide">
          <h2>All policies</h2>
          <div className="cards cards--stacked">
            {policies.map((policy) => (
              <article key={policy.id} className="card">
                <h3>{policy.policyNumber}</h3>
                <p>{policy.holderName}</p>
                <div className="task-meta">
                  <span>{policy.type}</span>
                  <span>{policy.status}</span>
                  <span>${Number(policy.premium || 0).toFixed(2)}</span>
                </div>
              </article>
            ))}
            {!policies.length ? <div className="empty">No policies available.</div> : null}
          </div>
        </article>
      </section>
    </ProtectedFrame>
  );

  const ClaimDetailScreen = () => {
    const { id } = useParams();
    const [localClaim, setLocalClaim] = useState(null);

    useEffect(() => {
      const found = claims.find((claim) => claim.id === id);
      if (found) {
        setLocalClaim(found);
        setClaimDetail(found);
        return;
      }

      loadClaimDetail(id).then((loaded) => setLocalClaim(loaded));
    }, [id]);

    const claim = localClaim || claimDetail;

    return (
      <ProtectedFrame>
        <header className="section-header">
          <div>
            <span className="badge">Claim detail</span>
            <h1>{claim?.claimNumber || 'Claim'}</h1>
          </div>
        </header>

        {claimDetailLoading ? <div className="loading-card">Loading claim...</div> : null}
        {claimDetailError ? <ErrorAlert message={claimDetailError} /> : null}

        {claim ? (
          <article className="panel panel--wide">
            <h2>Details</h2>
            <div className="cards cards--stacked">
              <article className="card">
                <h3>{claim.claimNumber}</h3>
                <p>{claim.description}</p>
                <div className="task-meta">
                  <span>{claim.status}</span>
                  <span>Policy: {claim.policy}</span>
                  <span>Incident: {claim.incidentDate}</span>
                  <span>Amount: ${Number(claim.amount || 0).toFixed(2)}</span>
                </div>
              </article>
              <article className="card">
                <h3>Notes</h3>
                <div className="list">
                  {(claim.notes || []).map((note, noteIndex) => (
                    <div key={`${note.createdAt || noteIndex}-${noteIndex}`}>
                      <strong>{note.author || 'System'}</strong>
                      <p>{note.text}</p>
                    </div>
                  ))}
                  {!claim.notes?.length ? <div className="empty">No notes added.</div> : null}
                </div>
              </article>
            </div>
          </article>
        ) : null}
      </ProtectedFrame>
    );
  };

  const DashboardScreen = () => (
    <div className="page">
      <Navbar onCopyToken={copyAccessToken} />
      <Hero
        summary={summary}
        totalTasks={tasks.length}
        completedTasks={completedCount}
        openTasks={openCount}
        user={user}
        token={token}
      />

      <ErrorAlert message={error} />

      <section className="grid">
        <TaskForm form={form} saving={saving} errors={taskErrors} onChange={handleChange} onSubmit={createTask} />

        <TaskFilters search={search} filter={filter} onSearchChange={setSearch} onFilterChange={setFilter} />

        <TaskList tasks={filteredTasks} onToggleComplete={toggleComplete} onDelete={deleteTask} />
      </section>
    </div>
  );

  if (isBootstrapping) {
    return (
      <div className="page auth-page">
        <div className="loading-card">Checking your session...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <AuthScreen mode="login" />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <AuthScreen mode="register" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/policies"
        element={
          <ProtectedRoute>
            <PoliciesScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            <ClaimsScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims/:id"
        element={
          <ProtectedRoute>
            <ClaimDetailScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
