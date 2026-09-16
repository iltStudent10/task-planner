export default function TaskForm({ form, saving, errors, onChange, onSubmit, title = 'Add a task', submitLabel = 'Add task' }) {
  return (
    <article className="panel panel--wide">
      <h2>{title}</h2>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          <span>Task</span>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Buy groceries"
            aria-invalid={Boolean(errors?.title)}
          />
          {errors?.title ? <span className="field-error">{errors.title}</span> : null}
        </label>
        <label>
          <span>Category</span>
          <input name="category" value={form.category} onChange={onChange} placeholder="Shopping" aria-invalid={Boolean(errors?.category)} />
          {errors?.category ? <span className="field-error">{errors.category}</span> : null}
        </label>
        <label>
          <span>Priority</span>
          <select name="priority" value={form.priority} onChange={onChange} aria-invalid={Boolean(errors?.priority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {errors?.priority ? <span className="field-error">{errors.priority}</span> : null}
        </label>
        <label>
          <span>Due date</span>
          <input name="dueDate" type="date" value={form.dueDate} onChange={onChange} aria-invalid={Boolean(errors?.dueDate)} />
          {errors?.dueDate ? <span className="field-error">{errors.dueDate}</span> : null}
        </label>
        <label className="form-grid__wide">
          <span>Notes</span>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Extra details for the task"
            rows="3"
            aria-invalid={Boolean(errors?.notes)}
          />
          {errors?.notes ? <span className="field-error">{errors.notes}</span> : null}
        </label>
        <button className="button form-grid__wide" type="submit" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
      </form>
    </article>
  );
}
