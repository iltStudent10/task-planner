import { useEffect, useState } from 'react';
import Hero from './components/Hero';
import TaskForm from './components/TaskForm';
import TaskFilters from './components/TaskFilters';
import TaskList from './components/TaskList';
import ErrorAlert from './components/ErrorAlert';

const blankForm = {
  title: '',
  category: 'Personal',
  priority: 'medium',
  dueDate: '',
  notes: '',
};

export default function App() {
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [summaryRes, tasksRes] = await Promise.all([fetch('/api/summary'), fetch('/api/tasks')]);

      if (!summaryRes.ok || !tasksRes.ok) {
        throw new Error('API request failed');
      }

      const summaryJson = await summaryRes.json();
      const tasksJson = await tasksRes.json();
      setSummary(summaryJson);
      setTasks(tasksJson.tasks || []);
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const createTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to create task');
      }

      setForm(blankForm);
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to create task');
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    });
    loadData();
  };

  const deleteTask = async (taskId) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    loadData();
  };

  const filteredTasks = tasks.filter((task) => {
    const searchHit = [task.title, task.category, task.notes, task.dueDate].join(' ').toLowerCase().includes(search.toLowerCase());
    const statusHit = filter === 'all' || (filter === 'completed' ? task.completed : !task.completed);
    return searchHit && statusHit;
  });

  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;

  return (
    <div className="page">
      <Hero summary={summary} totalTasks={tasks.length} completedTasks={completedCount} openTasks={openCount} />

      <ErrorAlert message={error} />

      <section className="grid">
        <TaskForm form={form} saving={saving} onChange={handleChange} onSubmit={createTask} />

        <TaskFilters search={search} filter={filter} onSearchChange={setSearch} onFilterChange={setFilter} />

        <TaskList tasks={filteredTasks} onToggleComplete={toggleComplete} onDelete={deleteTask} />
      </section>
    </div>
  );
}
