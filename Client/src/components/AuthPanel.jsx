import { useMemo, useState } from 'react';
import { loginUser, registerUser } from '../api/authApi';

const initialRegisterState = {
  username: '',
  displayName: '',
  email: '',
  password: '',
};

const initialLoginState = {
  identifier: '',
  password: '',
};

const passwordHint = 'At least 8 chars with uppercase, lowercase, and a number';

function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [registerForm, setRegisterForm] = useState(initialRegisterState);
  const [loginForm, setLoginForm] = useState(initialLoginState);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeTitle = useMemo(
    () => (mode === 'login' ? 'Welcome Back' : 'Create Your Account'),
    [mode],
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await loginUser(loginForm);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message || 'Unable to login');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const result = await registerUser(registerForm);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message || 'Unable to register');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="auth-panel">
        <header className="auth-panel__header">
          <p className="eyebrow">GrindForge Security</p>
          <h1>{activeTitle}</h1>
          <p className="auth-copy">
            Secure your progress with JWT sessions, HTTP-only cookies, and protected APIs.
          </p>
        </header>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Register
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <label htmlFor="identifier">Email or Username</label>
            <input
              id="identifier"
              type="text"
              value={loginForm.identifier}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  identifier: event.target.value,
                }))
              }
              required
              autoComplete="username"
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
              autoComplete="current-password"
            />

            <button type="submit" className="button" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              value={registerForm.username}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
              required
              minLength={3}
              autoComplete="username"
            />

            <label htmlFor="register-display-name">Display Name</label>
            <input
              id="register-display-name"
              type="text"
              value={registerForm.displayName}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  displayName: event.target.value,
                }))
              }
              required
              minLength={2}
              autoComplete="name"
            />

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              required
              autoComplete="email"
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="auth-hint">{passwordHint}</p>

            <button type="submit" className="button" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default AuthPanel;
