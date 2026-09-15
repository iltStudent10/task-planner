function TaskItem({ task, onToggleComplete, onDelete }) {
  return (
    <div className={`task task--${task.completed ? 'done' : 'open'}`}>
      <label className="task__main">
        <input type="checkbox" checked={task.completed} onChange={() => onToggleComplete(task)} />
        <div>
          <strong>{task.title}</strong>
          <p>{task.notes || 'No notes provided.'}</p>
          <div className="task-meta">
            <span>{task.category || 'General'}</span>
            <span>{task.priority}</span>
            <span>{task.dueDate || 'No due date'}</span>
          </div>
        </div>
      </label>
      <button className="button button--ghost" type="button" onClick={() => onDelete(task.id)}>
        Delete
      </button>
    </div>
  );
}

export default function TaskList({ tasks, onToggleComplete, onDelete }) {
  return (
    <article className="panel panel--wide">
      <h2>Your tasks</h2>
      <div className="tasks">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggleComplete={onToggleComplete} onDelete={onDelete} />
        ))}
        {!tasks.length ? <div className="empty">No tasks match your filters.</div> : null}
      </div>
    </article>
  );
}
