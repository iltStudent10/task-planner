export default function AuthForm({ mode, form, submitting, errors, onChange, onModeChange, onSubmit }) {
  return (
    <article className="panel auth-card">
      <div className="auth-card__intro">
        <span className="badge">Secure access</span>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p>
          {mode === 'login'
            ? 'Log in to load your saved tasks and continue where you left off.'
            : 'Register once and keep your task list tied to your personal account.'}
        </p>
      </div>

      <div className="auth-switcher" role="tablist" aria-label="Authentication mode">
        <button
          className={`button button--soft ${mode === 'login' ? 'button--active' : ''}`}
          type="button"
          onClick={() => onModeChange('login')}
        >
          Log in
        </button>
        <button
          className={`button button--soft ${mode === 'register' ? 'button--active' : ''}`}
          type="button"
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </div>

      <form className="form-grid auth-form" onSubmit={onSubmit}>
        {mode === 'register' ? (
          <>
            <label className="form-grid__wide">
              <span>Name</span>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Avery Smith"
                autoComplete="name"
                aria-invalid={Boolean(errors?.name)}
              />
              {errors?.name ? <span className="field-error">{errors.name}</span> : null}
            </label>

            <label className="form-grid__wide">
              <span>Role</span>
              <select name="role" value={form.role} onChange={onChange} aria-invalid={Boolean(errors?.role)}>
                <option value="adjuster">Adjuster</option>
                <option value="admin">Admin</option>
              </select>
              {errors?.role ? <span className="field-error">{errors.role}</span> : null}
            </label>
          </>
        ) : null}

        <label className="form-grid__wide">
          <span>Email</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="avery@example.com"
            autoComplete="email"
            aria-invalid={Boolean(errors?.email)}
          />
          {errors?.email ? <span className="field-error">{errors.email}</span> : null}
        </label>

        <label className="form-grid__wide">
          <span>Password</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder="At least 8 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            aria-invalid={Boolean(errors?.password)}
          />
          {errors?.password ? <span className="field-error">{errors.password}</span> : null}
        </label>

        <button className="button button--primary form-grid__wide" type="submit" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </article>
  );
}