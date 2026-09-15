export default function TaskForm({ form, saving, onChange, onSubmit }) {
  return (
    <article className="panel panel--wide">
      <h2>Add a task</h2>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span>Task</span>
          <input name="title" value={form.title} onChange={onChange} placeholder="Buy groceries" required />
        </label>
        <label>
          <span>Category</span>
          <input name="category" value={form.category} onChange={onChange} placeholder="Shopping" />
        </label>
        <label>
          <span>Priority</span>
          <select name="priority" value={form.priority} onChange={onChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>Due date</span>
          <input name="dueDate" value={form.dueDate} onChange={onChange} placeholder="Today / Friday" />
        </label>
        <label className="form-grid__wide">
          <span>Notes</span>
          <textarea name="notes" value={form.notes} onChange={onChange} placeholder="Extra details for the task" rows="3" />
        </label>
        <button className="button form-grid__wide" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Add task'}
        </button>
      </form>
    </article>
  );
}
