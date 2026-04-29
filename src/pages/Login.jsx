import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Briefcase,
  Users,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

const Login = () => {
  const { login, selectedRole, setRole } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [signInForm, setSignInForm] = useState({
    email: '',
    username: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleRoleSelect = (role) => {
    setRole(role);
    setError('');
  };

  const handleBackToRoles = () => {
    setRole(null);
    setError('');
    setSignInForm({ email: '', username: '', password: '' });
    setSignUpForm({ name: '', email: '', username: '', password: '', confirmPassword: '' });
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const validateSignIn = () => {
    if (!signInForm.email || !signInForm.username || !signInForm.password) {
      setError('All fields are required');
      return false;
    }
    if (signInForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const validateSignUp = () => {
    if (!signUpForm.name || !signUpForm.email || !signUpForm.username || !signUpForm.password || !signUpForm.confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (signUpForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!signUpForm.email.includes('@')) {
      setError('Invalid email format');
      return false;
    }
    return true;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateSignIn()) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      login(signInForm.email, signInForm.username, signInForm.password, selectedRole);
      navigate(selectedRole === 'brand' ? '/brand/overview' : '/influencer/overview');
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateSignUp()) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      login(signUpForm.email, signUpForm.username, signUpForm.password, selectedRole);
      navigate(selectedRole === 'brand' ? '/brand/overview' : '/influencer/overview');
    } catch {
      setError('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = {
    brand: {
      icon: Briefcase,
      title: 'Brand Marketer',
      subtitle: 'Create campaigns, discover influencers, and track ROI',
      color: 'var(--primary-500)',
      lightColor: 'var(--primary-50)',
      borderColor: 'var(--primary-200)',
      bgGradient: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
    },
    influencer: {
      icon: Users,
      title: 'Influencer',
      subtitle: 'Grow your brand and monetize your influence',
      color: 'var(--accent-500)',
      lightColor: 'rgb(250, 245, 255)',
      borderColor: 'var(--accent-400)',
      bgGradient: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))',
    },
  };

  const currentConfig = selectedRole ? roleConfig[selectedRole] : null;
  const RoleIcon = currentConfig?.icon;

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" style={currentConfig ? { backgroundColor: currentConfig.color } : {}} />
      <div className="auth-bg-orb auth-bg-orb-2" style={currentConfig ? { backgroundColor: currentConfig.color } : {}} />
      <div className="auth-bg-orb auth-bg-orb-3" />

      <div className="auth-container">
        {/* Logo Section */}
        <div className="auth-logo-section">
          <div className="auth-logo-icon">
            <TrendingUp size={28} />
          </div>
          <h1 className="auth-logo-text">
            Influencer<span>AI</span>
          </h1>
          <p className="auth-logo-subtitle">Predictive Influencer Marketing Platform</p>
        </div>

        {!selectedRole ? (
          // Role Selection View
          <div className="auth-role-selection">
            <div className="auth-header">
              <h2 className="auth-header-title">Choose Your Role</h2>
              <p className="auth-header-text">Select how you'll use InfluencerAI</p>
            </div>

            <div className="auth-roles-grid">
              {Object.entries(roleConfig).map(([role, config]) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className="auth-role-card"
                  style={{
                    borderColor: config.borderColor,
                  }}
                >
                  <div className="auth-role-icon" style={{ color: config.color }}>
                    <config.icon size={32} />
                  </div>
                  <h3 className="auth-role-title">{config.title}</h3>
                  <p className="auth-role-description">{config.subtitle}</p>
                  <div className="auth-role-arrow">→</div>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button onClick={handleBackToHome} className="auth-back-btn">
                ← Back to Home
              </button>
            </div>

            <div className="auth-badge">
              <Sparkles size={14} />
              Choose your dashboard to continue
            </div>
          </div>
        ) : (
          // Authentication Form View
          <div className="auth-form-container">
            <div className="auth-form-header">
              <button className="auth-back-btn" onClick={handleBackToRoles}>
                ← Back to roles
              </button>
              <div className="auth-role-indicator" style={{ backgroundColor: currentConfig.lightColor }}>
                <RoleIcon size={20} style={{ color: currentConfig.color }} />
                <span style={{ color: currentConfig.color }}>{currentConfig.title}</span>
              </div>
            </div>

            <div className="auth-form-content">
              <div className="auth-form-title-section">
                <h2 className="auth-form-title">
                  {activeTab === 'signin' ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="auth-form-subtitle">
                  {activeTab === 'signin'
                    ? 'Sign in to your account'
                    : `Create a ${currentConfig.title} account`}
                </p>
              </div>

              {/* Tab Toggle */}
              <div className="auth-tab-toggle">
                <button
                  className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('signin'); setError(''); }}
                  style={activeTab === 'signin' ? { backgroundColor: currentConfig.color } : {}}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('signup'); setError(''); }}
                  style={activeTab === 'signup' ? { backgroundColor: currentConfig.color } : {}}
                >
                  Create Account
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="auth-error-message">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Sign In Form */}
              {activeTab === 'signin' && (
                <form onSubmit={handleSignIn} className="auth-form">
                  <div className="auth-form-group">
                    <label className="auth-label">Email</label>
                    <div className="auth-input-wrapper">
                      <Mail size={18} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                        className="auth-input"
                        style={error && !signInForm.email ? { borderColor: 'var(--danger-500)' } : {}}
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Username</label>
                    <div className="auth-input-wrapper">
                      <User size={18} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="Enter your username"
                        value={signInForm.username}
                        onChange={(e) => setSignInForm({ ...signInForm, username: e.target.value })}
                        className="auth-input"
                        style={error && !signInForm.username ? { borderColor: 'var(--danger-500)' } : {}}
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrapper">
                      <Lock size={18} className="auth-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                        className="auth-input"
                        style={error && !signInForm.password ? { borderColor: 'var(--danger-500)' } : {}}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    style={{ backgroundColor: currentConfig.color }}
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>

                  <p className="auth-link-text">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('signup')}
                      style={{ color: currentConfig.color }}
                      className="auth-link-btn"
                    >
                      Create one here
                    </button>
                  </p>
                </form>
              )}

              {/* Sign Up Form */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignUp} className="auth-form">
                  <div className="auth-form-group">
                    <label className="auth-label">Full Name</label>
                    <div className="auth-input-wrapper">
                      <User size={18} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={signUpForm.name}
                        onChange={(e) => setSignUpForm({ ...signUpForm, name: e.target.value })}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Email</label>
                    <div className="auth-input-wrapper">
                      <Mail size={18} className="auth-input-icon" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={signUpForm.email}
                        onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Username</label>
                    <div className="auth-input-wrapper">
                      <User size={18} className="auth-input-icon" />
                      <input
                        type="text"
                        placeholder="Choose your username"
                        value={signUpForm.username}
                        onChange={(e) => setSignUpForm({ ...signUpForm, username: e.target.value })}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrapper">
                      <Lock size={18} className="auth-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                        className="auth-input"
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Confirm Password</label>
                    <div className="auth-input-wrapper">
                      <Lock size={18} className="auth-input-icon" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                        className="auth-input"
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit-btn"
                    style={{ backgroundColor: currentConfig.color }}
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <p className="auth-link-text">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('signin')}
                      style={{ color: currentConfig.color }}
                      className="auth-link-btn"
                    >
                      Sign in instead
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
