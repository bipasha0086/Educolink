import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { IoMailOutline, IoLockClosedOutline, IoPersonOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';
import { useAuth } from '../context/AuthContext';
import { requestJson } from '../services/api';
import '../styles/login.css';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const validateForm = () => {
    if (!fullName.trim()) return 'Full name is required';
    if (!email.trim()) return 'Email is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await requestJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      const { credential } = credentialResponse;
      if (!credential) {
        throw new Error('Google signup failed. Missing credential token.');
      }

      const data = await requestJson('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential })
      });

      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <FloatingParticles />
      <GradientMesh colors={['#574db3', '#9c93fe', '#b8b3ff']} />

      <motion.div className="login-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        {/* Left Section - Branding */}
        <div className="login-branding">
          <motion.div className="login-brand-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <img src="/Educolink%20logo.png" alt="EducoLink" className="login-logo-img" />
            <p style={{ marginTop: '1rem' }}>Join Your AI-Powered Learning Journey</p>
            <div className="login-features">
              <div className="feature-badge">
                <span>✨</span> Smart Learning
              </div>
              <div className="feature-badge">
                <span>🚀</span> Fast Progress
              </div>
              <div className="feature-badge">
                <span>🎯</span> Personalized
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Section - Register Form */}
        <div className="login-form-section">
          <motion.div className="login-form-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <div className="login-form-header">
              <h2>Create Account</h2>
              <p>Join EducoLink and start learning smarter</p>
            </div>

            {error && (
              <motion.div className="login-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="login-form">
              {/* Full Name Input */}
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <IoPersonOutline className="input-icon" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <IoMailOutline className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <IoLockClosedOutline className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <IoLockClosedOutline className="input-icon" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="login-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="form-group checkbox">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  I agree to the <Link to="/terms" style={{ color: '#574db3' }}>Terms of Service</Link>
                </label>
              </div>

              {/* Register Button */}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span> Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span>Or register with</span>
            </div>

            {/* Google Auth */}
            {hasGoogleClientId ? (
              <div className="google-login-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSignup}
                  onError={() => setError('Google signup failed. Please try again.')}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="signup_with"
                  width="100%"
                />
              </div>
            ) : (
              <div className="google-client-warning">
                Google sign-up is unavailable. Set VITE_GOOGLE_CLIENT_ID in your frontend environment.
              </div>
            )}

            {/* Sign In Link */}
            <div className="signup-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="login-decoration decoration-1"></div>
      <div className="login-decoration decoration-2"></div>
    </div>
  );
}
