import { useEffect, useState } from 'react';
import Hero from './components/Hero';
import AuthForm from './components/AuthForm';
import TaskForm from './components/TaskForm';
import TaskFilters from './components/TaskFilters';
import TaskList from './components/TaskList';
import ErrorAlert from './components/ErrorAlert';
import { createAuthHeaders, parseJsonResponse, readStoredSession, saveStoredSession } from './api';

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

const normalizeError = async (response, fallbackMessage) => {
  try {
    const body = await response.json();
    return body?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

export default function App() {
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [authForm, setAuthForm] = useState(blankAuthForm);
  const [authMode, setAuthMode] = useState('login');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [session, setSession] = useState(() => readStoredSession());

  const clearSession = (message = '') => {
    setSession(null);
    setSummary(null);
    setTasks([]);
    setForm(blankForm);
    saveStoredSession(null);
    if (message) {
      setError(message);
    }
  };

  const authFetch = async (url, options = {}, token = session?.token) => {
    const response = await fetch(url, {
      ...options,
      headers: createAuthHeaders(token, options.headers, options.body),
    });

    if (response.status === 401) {
      clearSession('Your session expired. Please log in again.');
      throw new Error('Authentication required');
    }

    return response;
  };

  const loadData = async (token = session?.token) => {
    try {
      if (!token) {
        setSummary(null);
        setTasks([]);
        return;
      }

      const [summaryRes, tasksRes] = await Promise.all([
        authFetch('/api/summary', {}, token),
        authFetch('/api/tasks', {}, token),
      ]);

      if (!summaryRes.ok || !tasksRes.ok) {
        throw new Error('API request failed');
      }

      const summaryJson = await parseJsonResponse(summaryRes);
      const tasksJson = await parseJsonResponse(tasksRes);
      setSummary(summaryJson);
      setTasks(tasksJson.tasks || []);
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to load dashboard data');
      }
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const storedSession = readStoredSession();

      if (!storedSession?.token) {
        setBootstrapping(false);
        return;
      }

      try {
        const response = await authFetch('/api/auth/me', {}, storedSession.token);
        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await parseJsonResponse(response);
        const nextSession = { token: storedSession.token, user: data.user };
        setSession(nextSession);
        saveStoredSession(nextSession);
        await loadData(nextSession.token);
      } catch {
        clearSession();
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthModeChange = (nextMode) => {
    setAuthMode(nextMode);
    setAuthForm((current) => (nextMode === 'login' ? { ...current, name: '' } : current));
    setError('');
  };

  const handleSignOut = () => {
    clearSession();
    setError('');
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setError('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        authMode === 'register'
          ? { name: authForm.name, email: authForm.email, password: authForm.password }
          : { email: authForm.email, password: authForm.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await normalizeError(response, 'Unable to authenticate'));
      }

      const data = await parseJsonResponse(response);
      const nextSession = { token: data.token, user: data.user };
      setSession(nextSession);
      saveStoredSession(nextSession);
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
    setSaving(true);
    setError('');

    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(form),
      }, session?.token);

      if (!res.ok) {
        throw new Error(await normalizeError(res, 'Unable to create task'));
      }

      setForm(blankForm);
      await loadData(session?.token);
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
        session?.token,
      );
      await loadData(session?.token);
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to update task');
      }
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await authFetch(`/api/tasks/${taskId}`, { method: 'DELETE' }, session?.token);
      await loadData(session?.token);
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

  if (bootstrapping) {
    return (
      <div className="page auth-page">
        <div className="loading-card">Checking your session...</div>
      </div>
    );
  }

  if (!session?.token) {
    return (
      <div className="page auth-page">
        <section className="auth-hero">
          <span className="badge">Task Manager</span>
          <h1>Keep your day organized.</h1>
          <p>Create an account or log in to store your personal task list securely.</p>
        </section>

        <ErrorAlert message={error} />

        <AuthForm mode={authMode} form={authForm} submitting={authBusy} onChange={handleAuthChange} onModeChange={handleAuthModeChange} onSubmit={submitAuth} />
      </div>
    );
  }

  return (
    <div className="page">
      <Hero summary={summary} totalTasks={tasks.length} completedTasks={completedCount} openTasks={openCount} user={session.user} onLogout={handleSignOut} />

      <ErrorAlert message={error} />

      <section className="grid">
        <TaskForm form={form} saving={saving} onChange={handleChange} onSubmit={createTask} />

        <TaskFilters search={search} filter={filter} onSearchChange={setSearch} onFilterChange={setFilter} />

        <TaskList tasks={filteredTasks} onToggleComplete={toggleComplete} onDelete={deleteTask} />
      </section>
    </div>
  );
}
