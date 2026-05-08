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
  const { login, signup, selectedRole, setRole } = useAuth();
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
    category: 'Lifestyle',
    followers: '',
    password: '',
    confirmPassword: '',
  });

  const influencerCategories = [
    'Lifestyle',
    'Tech',
    'Fashion',
    'Gaming',
    'Health',
    'Food',
    'Beauty',
    'Fitness',
    'Travel',
    'Finance',
  ];

  const followerRangeValue = Math.min(
    5_000_000,
    Math.max(0, Number(signUpForm.followers || 10000))
  );

  const formatFollowerCount = (value) => {
    const count = Number(value || 0);
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
    if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
    return count.toLocaleString();
  };

  const demoCredentials = {
    brand: {
      label: 'Brand demo',
      email: 'brand@test.com',
      username: 'brand_user',
      password: 'password123',
    },
    influencer: {
      label: 'Influencer demo',
      email: 'influencer@test.com',
      username: 'travel_vibes',
      password: 'password123',
    },
  };

  const handleRoleSelect = (role) => {
    setRole(role);
    setError('');
  };

  const handleBackToRoles = () => {
    setRole(null);
    setError('');
    setSignInForm({ email: '', username: '', password: '' });
    setSignUpForm({
      name: '',
      email: '',
      username: '',
      category: 'Lifestyle',
      followers: '',
      password: '',
      confirmPassword: '',
    });
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleFillDemoCredentials = () => {
    const demo = demoCredentials[selectedRole];
    setActiveTab('signin');
    setError('');
    setSignInForm({
      email: demo.email,
      username: demo.username,
      password: demo.password,
    });
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
    if (selectedRole === 'influencer') {
      const followers = Number(signUpForm.followers);
      if (!signUpForm.category) {
        setError('Choose your influencer category');
        return false;
      }
      if (!signUpForm.followers || !Number.isFinite(followers) || followers < 0) {
        setError('Enter a valid followers count');
        return false;
      }
    }
    return true;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateSignIn()) return;
    setLoading(true);
    try {
      await login(signInForm.email, signInForm.username, signInForm.password, selectedRole);
      navigate(selectedRole === 'brand' ? '/brand/overview' : '/influencer/profile');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
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
      await signup({
        name: signUpForm.name,
        email: signUpForm.email,
        username: signUpForm.username,
        password: signUpForm.password,
        role: selectedRole,
        category: selectedRole === 'influencer' ? signUpForm.category : undefined,
        followers: selectedRole === 'influencer' ? Number(signUpForm.followers) : undefined,
      });
      navigate(selectedRole === 'brand' ? '/brand/overview' : '/influencer/profile');
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleConfig = {
    brand: {
      icon: Briefcase,
      title: 'Brand Marketer',
      subtitle: 'Create campaigns, discover influencers, and track ROI',
      description: 'Plan campaigns, run ML recommendations, and invite creators who match your audience.',
      stats: ['Campaign ROI', 'Influencer ranking', 'Reports'],
      color: 'var(--primary-500)',
      lightColor: 'var(--primary-50)',
      borderColor: 'var(--primary-200)',
    },
    influencer: {
      icon: Users,
      title: 'Influencer',
      subtitle: 'Grow your brand and monetize your influence',
      description: 'Manage your profile, receive brand invitations, and track accepted campaign activity.',
      stats: ['Profile metrics', 'Brand invites', 'Earnings'],
      color: 'var(--accent-500)',
      lightColor: 'var(--primary-50)',
      borderColor: 'var(--accent-400)',
    },
  };

  const currentConfig = selectedRole ? roleConfig[selectedRole] : null;
  const RoleIcon = currentConfig?.icon;
  const currentDemo = selectedRole ? demoCredentials[selectedRole] : null;

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

              {activeTab === 'signin' && currentDemo && (
                <div className="auth-demo-panel">
                  <div>
                    <p className="auth-demo-label">{currentDemo.label}</p>
                    <p className="auth-demo-details">
                      {currentDemo.email} | {currentDemo.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="auth-demo-fill-btn"
                    onClick={handleFillDemoCredentials}
                    style={{ backgroundColor: currentConfig.color }}
                  >
                    Fill demo
                  </button>
                </div>
              )}

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

                  {selectedRole === 'influencer' && (
                    <>
                      <div className="auth-form-group">
                        <label className="auth-label">Category</label>
                        <div className="auth-input-wrapper">
                          <Users size={18} className="auth-input-icon" />
                          <select
                            value={signUpForm.category}
                            onChange={(e) => setSignUpForm({ ...signUpForm, category: e.target.value })}
                            className="auth-input"
                          >
                            {influencerCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="auth-form-group">
                        <label className="auth-label">Followers Count</label>
                        <div className="auth-input-wrapper">
                          <TrendingUp size={18} className="auth-input-icon" />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Enter your followers count"
                            value={signUpForm.followers}
                            onChange={(e) => setSignUpForm({ ...signUpForm, followers: e.target.value })}
                            className="auth-input"
                          />
                        </div>
                        <div className="followers-range-panel">
                          <div className="followers-range-top">
                            <span>Range</span>
                            <strong>{formatFollowerCount(followerRangeValue)} followers</strong>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5000000"
                            step="1000"
                            value={followerRangeValue}
                            onChange={(e) => setSignUpForm({ ...signUpForm, followers: e.target.value })}
                            className="followers-range-input"
                          />
                          <div className="followers-range-scale">
                            <span>0</span>
                            <span>1M</span>
                            <span>5M</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

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
