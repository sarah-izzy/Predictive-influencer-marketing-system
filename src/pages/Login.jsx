import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Briefcase, Users, ArrowRight, Sparkles, Shield, BarChart3 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState(null);

  const handleLogin = (role) => {
    login(role);
    navigate(role === 'brand' ? '/brand/overview' : '/influencer/overview');
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-container">
        <div className="login-brand">
          <div className="login-brand-icon">
            <TrendingUp size={28} />
          </div>
          <h1 className="login-title">
            Influencer<span>AI</span>
          </h1>
          <p className="login-subtitle">
            Predictive Influencer Marketing Platform
          </p>
        </div>

        <div className="login-badge">
          <Sparkles size={14} />
          Choose your dashboard to continue
        </div>

        <div className="login-roles">
          <button
            className={`role-card ${hoveredRole === 'brand' ? 'role-card-hovered' : ''}`}
            onClick={() => handleLogin('brand')}
            onMouseEnter={() => setHoveredRole('brand')}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="role-card-icon role-card-icon-brand">
              <Briefcase size={28} />
            </div>
            <h2 className="role-card-title">Brand Marketer</h2>
            <p className="role-card-desc">
              Create campaigns, discover top influencers, and track ROI with AI-powered analytics.
            </p>
            <div className="role-card-features">
              <div className="role-feature">
                <Shield size={14} />
                <span>Campaign Management</span>
              </div>
              <div className="role-feature">
                <BarChart3 size={14} />
                <span>ML Recommendations</span>
              </div>
              <div className="role-feature">
                <TrendingUp size={14} />
                <span>ROI Analytics</span>
              </div>
            </div>
            <div className="role-card-btn role-card-btn-brand">
              Enter Dashboard
              <ArrowRight size={16} />
            </div>
          </button>

          <button
            className={`role-card ${hoveredRole === 'influencer' ? 'role-card-hovered' : ''}`}
            onClick={() => handleLogin('influencer')}
            onMouseEnter={() => setHoveredRole('influencer')}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className="role-card-icon role-card-icon-influencer">
              <Users size={28} />
            </div>
            <h2 className="role-card-title">Influencer</h2>
            <p className="role-card-desc">
              Manage your profile, track performance, respond to campaign invitations, and view earnings.
            </p>
            <div className="role-card-features">
              <div className="role-feature">
                <Users size={14} />
                <span>Profile Management</span>
              </div>
              <div className="role-feature">
                <BarChart3 size={14} />
                <span>Performance Insights</span>
              </div>
              <div className="role-feature">
                <TrendingUp size={14} />
                <span>Earnings Tracker</span>
              </div>
            </div>
            <div className="role-card-btn role-card-btn-influencer">
              Enter Dashboard
              <ArrowRight size={16} />
            </div>
          </button>
        </div>

        <p className="login-footer">
          Powered by Machine Learning · Real-time Analytics · Smart Predictions
        </p>
      </div>
    </div>
  );
};

export default Login;
