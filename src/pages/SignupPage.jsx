import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const SIGNUP_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .sp-root {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    font-family: 'Inter', sans-serif;
    padding: 2rem 1rem;
  }

  .sp-card {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-radius: 1.75rem;
    padding: 2.5rem 2.75rem;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #f0f0ff;
    animation: sp-fade-in 0.5s ease;
  }

  @keyframes sp-fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .sp-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .sp-logo-icon {
    background: linear-gradient(135deg, #6a5af9, #b47aff);
    border-radius: 1rem;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(106, 90, 249, 0.5);
    font-size: 1.75rem;
  }

  .sp-title {
    font-size: 1.6rem;
    font-weight: 800;
    text-align: center;
    margin: 0.75rem 0 0.25rem;
    color: #ffffff;
    letter-spacing: -0.5px;
  }

  .sp-subtitle {
    text-align: center;
    font-size: 0.78rem;
    color: rgba(255,255,255,0.45);
    margin-bottom: 1.75rem;
    font-weight: 500;
  }

  .sp-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.5);
    margin-bottom: 0.4rem;
  }

  .sp-field {
    width: 100%;
    box-sizing: border-box;
    padding: 0.8rem 1rem;
    margin-bottom: 1rem;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 0.85rem;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 0.9rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    transition: border-color 0.25s, background 0.25s;
    outline: none;
  }

  .sp-field::placeholder {
    color: rgba(255,255,255,0.3);
  }

  .sp-field:focus {
    border-color: rgba(106, 90, 249, 0.8);
    background: rgba(255, 255, 255, 0.12);
  }

  .sp-field option {
    background: #302b63;
    color: #fff;
  }

  .sp-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 80, 80, 0.15);
    border: 1px solid rgba(255, 80, 80, 0.3);
    border-radius: 0.75rem;
    padding: 0.7rem 1rem;
    color: #ff8080;
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .sp-btn {
    width: 100%;
    padding: 0.9rem 1rem;
    border: none;
    border-radius: 0.85rem;
    background: linear-gradient(135deg, #6a5af9, #9b87ff);
    color: #fff;
    font-weight: 700;
    font-size: 0.92rem;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s;
    margin-top: 0.5rem;
    box-shadow: 0 4px 20px rgba(106, 90, 249, 0.4);
  }

  .sp-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(106, 90, 249, 0.55);
  }

  .sp-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .sp-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sp-divider {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.1);
    margin: 1.5rem 0 1.25rem;
  }

  .sp-login-link {
    text-align: center;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.45);
    font-weight: 500;
  }

  .sp-login-link a {
    color: #9b87ff;
    font-weight: 700;
    text-decoration: none;
    transition: color 0.2s;
  }

  .sp-login-link a:hover {
    color: #b9aaff;
    text-decoration: underline;
  }

  .sp-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: sp-spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 0.5rem;
  }

  @keyframes sp-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 480px) {
    .sp-card { padding: 1.75rem 1.5rem; border-radius: 1.25rem; }
    .sp-title { font-size: 1.35rem; }
  }
`;

const ROLES = [
  { value: 'doctor',         label: 'Doctor / Clinician' },
  { value: 'hospital-admin', label: 'Hospital Administrator' },
  { value: 'researcher',     label: 'Researcher' },
  { value: 'system-admin',   label: 'System Administrator' },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ROLES[0].value,
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with real API call
      console.log('Signup payload:', formData);
      await new Promise((r) => setTimeout(r, 800)); // simulate network
      navigate('/login');
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{SIGNUP_STYLES}</style>
      <div className="sp-root">
        <div className="sp-card">
          {/* Logo */}
          <div className="sp-logo">
            <div className="sp-logo-icon">🏥</div>
          </div>

          <h1 className="sp-title">Create Your Account</h1>
          <p className="sp-subtitle">Join HealthForecast AI — choose your role to get started</p>

          {error && (
            <div className="sp-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <label className="sp-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Dr. Jane Smith"
              value={formData.name}
              onChange={handleChange}
              className="sp-field"
              autoComplete="name"
              required
            />

            <label className="sp-label" htmlFor="signup-email">Work Email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              placeholder="name@healthforecast.ai"
              value={formData.email}
              onChange={handleChange}
              className="sp-field"
              autoComplete="email"
              required
            />

            <label className="sp-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              name="password"
              placeholder="Min. 6 characters"
              value={formData.password}
              onChange={handleChange}
              className="sp-field"
              autoComplete="new-password"
              required
            />

            <label className="sp-label" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="sp-field"
              autoComplete="new-password"
              required
            />

            <label className="sp-label" htmlFor="role">Your Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="sp-field"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <button type="submit" className="sp-btn" disabled={loading}>
              {loading ? <><span className="sp-spinner" />Creating Account...</> : 'Create Account'}
            </button>
          </form>

          <hr className="sp-divider" />

          <p className="sp-login-link">
            Already have an account?{' '}
            <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
