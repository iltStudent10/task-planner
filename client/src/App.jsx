import { useEffect, useState } from 'react';
import Hero from './components/Hero';
import AuthForm from './components/AuthForm';
import TaskForm from './components/TaskForm';
import TaskFilters from './components/TaskFilters';
import TaskList from './components/TaskList';
import ErrorAlert from './components/ErrorAlert';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  role: 'adjuster',
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
  role: '',
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

  if (mode === 'register' && !['adjuster', 'admin'].includes(String(value.role || ''))) {
    errors.role = 'Choose a valid role.';
  }

  return errors;
};

const hasErrors = (errors) => Object.values(errors).some(Boolean);

export default function App() {
  const { user, token, login, logout, isBootstrapping } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const authMode = location.pathname === '/register' ? 'register' : 'login';
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [authForm, setAuthForm] = useState(blankAuthForm);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [taskErrors, setTaskErrors] = useState(blankFormErrors);
  const [authErrors, setAuthErrors] = useState(blankAuthErrors);
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [taskDetail, setTaskDetail] = useState(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [taskDetailError, setTaskDetailError] = useState('');

  const clearSession = (message = '') => {
    setSummary(null);
    setTasks([]);
    setTaskDetail(null);
    setTaskDetailError('');
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
        return;
      }

      const [summaryRes, tasksRes] = await Promise.all([
        authFetch('/api/dashboard', {}, authToken),
        authFetch('/api/tasks', {}, authToken),
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
    if (token) {
      loadData(token);
    }
  }, [token]);

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
    setAuthForm((current) => (nextMode === 'login' ? { ...current, name: '' } : current));
    setAuthErrors(blankAuthErrors);
    setError('');
    navigate(nextMode === 'register' ? '/register' : '/login');
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
          ? { name: authForm.name, email: authForm.email, password: authForm.password, role: authForm.role }
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

      const body = await parseJsonResponse(res);
      setForm(blankForm);
      setTaskErrors(blankFormErrors);
      await loadData(token);
      return body.task || null;
    } catch (err) {
      setError(err.message || 'Unable to create task');
      return null;
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
      return true;
    } catch (err) {
      if (err.message !== 'Authentication required') {
        setError(err.message || 'Unable to delete task');
      }
      return false;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const searchHit = [task.title, task.category, task.notes, task.dueDate].join(' ').toLowerCase().includes(search.toLowerCase());
    const statusHit = filter === 'all' || (filter === 'completed' ? task.completed : !task.completed);
    return searchHit && statusHit;
  });

  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;
  const upcomingTasks = tasks
    .filter((task) => !task.completed && task.dueDate)
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .slice(0, 3);
  const highPriorityOpenTasks = tasks
    .filter((task) => !task.completed && task.priority === 'high')
    .slice(0, 3);
  const recentCompletedTasks = tasks
    .filter((task) => task.completed)
    .slice(0, 3);

  const loadTaskDetail = async (taskId) => {
    if (!token) {
      return null;
    }

    setTaskDetailLoading(true);
    setTaskDetailError('');

    try {
      const response = await authFetch(`/api/tasks/${taskId}`, {}, token);
      if (!response.ok) {
        throw new Error('Unable to load task');
      }

      const body = await parseJsonResponse(response);
      setTaskDetail(body.task || null);
      return body.task || null;
    } catch (err) {
      setTaskDetailError(err.message || 'Unable to load task');
      return null;
    } finally {
      setTaskDetailLoading(false);
    }
  };

  const renderProtectedFrame = (children) => (
    <div className="page">
      <Navbar />
      {children}
    </div>
  );

  const renderAuthScreen = (mode) => {
    const title = mode === 'login' ? 'Welcome back' : 'Create your account';
    const message = mode === 'login'
      ? 'Log in to access your dashboard and tasks.'
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

  const renderTasksScreen = () => renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">Tasks</span>
          <h1>Tasks</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button" to="/tasks/new">
            Create task
          </Link>
        </div>
      </header>

      <section className="grid">
        <TaskFilters search={search} filter={filter} onSearchChange={setSearch} onFilterChange={setFilter} />

        <TaskList tasks={filteredTasks} onToggleComplete={toggleComplete} onDelete={deleteTask} />
      </section>
    </>,
  );

  const renderCreateTaskScreen = () => renderProtectedFrame(
    <>
      <header className="section-header">
        <div>
          <span className="badge">Create task</span>
          <h1>New task</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button button--soft" to="/tasks">
            Back to tasks
          </Link>
        </div>
      </header>

      <ErrorAlert message={error} />

      <TaskForm
        form={form}
        saving={saving}
        errors={taskErrors}
        onChange={handleChange}
        onSubmit={async (event) => {
          const createdTask = await createTask(event);
          if (createdTask?.id) {
            navigate(`/tasks/${createdTask.id}`);
          }
        }}
        title="Create a task"
        submitLabel="Create task"
      />
    </>,
  );

  const TaskDetailScreen = () => {
    const { id } = useParams();
    const [localTask, setLocalTask] = useState(null);

    useEffect(() => {
      const found = tasks.find((task) => task.id === id);
      if (found) {
        setLocalTask(found);
        setTaskDetail(found);
        return;
      }

      loadTaskDetail(id).then((loaded) => setLocalTask(loaded));
    }, [id, tasks]);

    const task = localTask || taskDetail;

    const handleDeleteFromDetail = async () => {
      const removed = await deleteTask(id);
      if (removed) {
        navigate('/tasks');
      }
    };

    return (
      renderProtectedFrame(
        <>
          <header className="section-header">
            <div>
              <span className="badge">Task detail</span>
              <h1>{task?.title || 'Task'}</h1>
            </div>
          </header>

          {taskDetailLoading ? <div className="loading-card">Loading task...</div> : null}
          {taskDetailError ? <ErrorAlert message={taskDetailError} /> : null}

          {task ? (
            <article className="panel panel--wide">
              <h2>Details</h2>
              <div className="cards cards--stacked">
                <article className="card">
                  <h3>{task.title}</h3>
                  <p>{task.notes || 'No notes provided.'}</p>
                  <div className="task-meta">
                    <span>{task.completed ? 'Completed' : 'Open'}</span>
                    <span>{task.category || 'General'}</span>
                    <span>{task.priority}</span>
                    <span>{task.dueDate || 'No due date'}</span>
                  </div>
                </article>
                <article className="card">
                  <h3>Actions</h3>
                  <div className="task-detail__actions">
                    <button className="button" type="button" onClick={() => toggleComplete(task)}>
                      {task.completed ? 'Mark open' : 'Mark complete'}
                    </button>
                    <button className="button button--ghost" type="button" onClick={handleDeleteFromDetail}>
                      Delete task
                    </button>
                  </div>
                </article>
              </div>
            </article>
          ) : null}
        </>,
      )
    );
  };

  const renderDashboardScreen = () => (
    <div className="page">
      <Navbar />
      <Hero
        summary={summary}
        totalTasks={tasks.length}
        completedTasks={completedCount}
        openTasks={openCount}
        user={user}
      />

      <ErrorAlert message={error} />

      <header className="section-header">
        <div>
          <span className="badge">Overview</span>
          <h1>Your tasks</h1>
        </div>
        <div className="section-header__actions">
          <Link className="button" to="/tasks/new">
            Create task
          </Link>
          <Link className="button button--soft" to="/tasks">
            View all tasks
          </Link>
        </div>
      </header>

      <section className="cards dashboard-overview">
        <article className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>Upcoming</h2>
              <p>Open tasks with the closest due dates.</p>
            </div>
            <span className="badge">{upcomingTasks.length}</span>
          </div>
          <div className="dashboard-preview-list">
            {upcomingTasks.map((task) => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="dashboard-preview-item">
                <strong>{task.title}</strong>
                <div className="task-meta">
                  <span>{task.dueDate}</span>
                  <span>{task.priority}</span>
                </div>
              </Link>
            ))}
            {!upcomingTasks.length ? <div className="empty">No upcoming due dates.</div> : null}
          </div>
        </article>

        <article className="card dashboard-card">
          <div className="dashboard-card__header">
            <div>
              <h2>High priority</h2>
              <p>The tasks that need attention first.</p>
            </div>
            <span className="badge">{highPriorityOpenTasks.length}</span>
          </div>
          <div className="dashboard-preview-list">
            {highPriorityOpenTasks.map((task) => (
              <div key={task.id} className="dashboard-preview-item">
                <strong>{task.title}</strong>
                <div className="task-meta">
                  <span>{task.category || 'General'}</span>
                  <span>{task.dueDate || 'No due date'}</span>
                </div>
                <div className="task-detail__actions">
                  <button className="button button--soft" type="button" onClick={() => toggleComplete(task)}>
                    Mark complete
                  </button>
                  <Link className="button button--ghost" to={`/tasks/${task.id}`}>
                    Open
                  </Link>
                </div>
              </div>
            ))}
            {!highPriorityOpenTasks.length ? <div className="empty">No high-priority open tasks.</div> : null}
          </div>
        </article>

        <article className="card dashboard-card dashboard-card--wide">
          <div className="dashboard-card__header">
            <div>
              <h2>Recently completed</h2>
              <p>A quick look at what has already been finished.</p>
            </div>
            <span className="badge">{recentCompletedTasks.length}</span>
          </div>
          <div className="dashboard-preview-list">
            {recentCompletedTasks.map((task) => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="dashboard-preview-item dashboard-preview-item--done">
                <strong>{task.title}</strong>
                <div className="task-meta">
                  <span>{task.category || 'General'}</span>
                  <span>{task.priority}</span>
                  <span>{task.dueDate || 'No due date'}</span>
                </div>
              </Link>
            ))}
            {!recentCompletedTasks.length ? <div className="empty">No completed tasks yet.</div> : null}
          </div>
        </article>
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
      <Route path="/login" element={token ? <Navigate to="/" replace /> : renderAuthScreen('login')} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : renderAuthScreen('register')} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {renderDashboardScreen()}
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            {renderTasksScreen()}
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <ProtectedRoute>
            {renderCreateTaskScreen()}
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <TaskDetailScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
