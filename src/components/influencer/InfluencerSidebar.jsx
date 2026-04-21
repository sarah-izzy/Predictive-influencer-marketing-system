import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  User,
  BarChart3,
  Mail,
  DollarSign,
  TrendingUp,
  LogOut,
  Award,
} from 'lucide-react';

const InfluencerSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Overview', path: '/influencer/overview', icon: LayoutDashboard },
    { name: 'My Profile', path: '/influencer/profile', icon: User },
    { name: 'Performance', path: '/influencer/performance', icon: BarChart3 },
    { name: 'Invitations', path: '/influencer/invitations', icon: Mail },
    { name: 'Earnings', path: '/influencer/earnings', icon: DollarSign },
  ];

  return (
    <nav className={`sidebar sidebar-influencer ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon sidebar-brand-icon-inf">
          <TrendingUp size={20} />
        </div>
        <div className="sidebar-brand-text">
          Influencer<span>AI</span>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">Influencer Dashboard</div>
        {navLinks.map((link) => {
          const IconComponent = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <IconComponent size={18} />
              {link.name}
            </Link>
          );
        })}

        <div className="sidebar-section-label" style={{ marginTop: 'auto', paddingTop: 24 }}>
          Your Tier
        </div>
        <div className="sidebar-info-box sidebar-tier-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Award size={18} style={{ color: '#fb923c' }} />
            <div className="sidebar-info-title">{user?.tier || 'Rising Star'}</div>
          </div>
          <div className="sidebar-info-sub">Keep growing your engagement to reach the next tier!</div>
          <div className="sidebar-progress-track">
            <div className="sidebar-progress-fill sidebar-progress-fill-inf" style={{ width: '68%' }} />
          </div>
          <div className="sidebar-info-sub">68% to Gold Tier</div>
        </div>

        {user && (
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar" style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--accent-500))' }}>
              {user.avatar}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.category} Creator</div>
            </div>
          </div>
        )}

        <Link to="/login" onClick={logout} className="sidebar-logout">
          <LogOut size={18} />
          Sign Out
        </Link>
      </div>
    </nav>
  );
};

export default InfluencerSidebar;
