import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import AuthForm from './AuthForm';
import Navbar from './Navbar';
import ProtectedRoute from './ProtectedRoute';

let mockAuthState = {
  user: { name: 'Jamie Parker', email: 'jamie@example.com' },
  token: 'abc123',
  logout: vi.fn(),
  isAuthenticated: true,
  isBootstrapping: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('Client UI requirements', () => {
  beforeEach(() => {
    mockAuthState = {
      user: { name: 'Jamie Parker', email: 'jamie@example.com' },
      token: 'abc123',
      logout: vi.fn(),
      isAuthenticated: true,
      isBootstrapping: false,
    };
  });

  it('Login page renders email and password fields', () => {
    render(
      <AuthForm
        mode="login"
        form={{ name: '', email: '', password: '', role: 'adjuster' }}
        submitting={false}
        errors={{}}
        onChange={() => {}}
        onModeChange={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('Navbar renders navigation links and app name', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /policies/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /claims/i })).toBeInTheDocument();
    expect(screen.getByText(/jamie parker/i)).toBeInTheDocument();
  });

  it('Protected routes redirect unauthenticated users', () => {
    mockAuthState = {
      isAuthenticated: false,
      isBootstrapping: false,
    };

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/secure" element={<ProtectedRoute><div>Protected content</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/login page/i)).toBeInTheDocument();
  });
});
