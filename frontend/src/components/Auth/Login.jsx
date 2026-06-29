import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }               = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>💬</div>
          <h1 style={styles.logoText}>ChatApp</h1>
        </div>
        <p style={styles.subtitle}>Sign in to continue</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0b141a 0%, #111b21 100%)',
  },
  card: {
    background: '#202c33',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoIcon: { fontSize: 36 },
  logoText: {
    fontSize: 26,
    fontWeight: 600,
    color: '#00a884',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#8696a0',
    fontSize: 14,
    marginBottom: 28,
  },
  error: {
    background: 'rgba(241,92,109,0.15)',
    border: '1px solid rgba(241,92,109,0.4)',
    color: '#f15c6d',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 20,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#8696a0', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    background: '#2a3942',
    border: '1px solid #374045',
    borderRadius: 8,
    color: '#e9edef',
    fontSize: 15,
    padding: '12px 14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  btn: {
    background: '#00a884',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    padding: '13px',
    marginTop: 4,
    transition: 'background 0.2s',
  },
  switchText: { color: '#8696a0', fontSize: 14, textAlign: 'center', marginTop: 24 },
  link: { color: '#00a884', textDecoration: 'none', fontWeight: 500 },
};
