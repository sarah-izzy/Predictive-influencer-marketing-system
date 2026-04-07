import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  BarChart3,
  Info,
  TrendingUp,
  LogOut,
} from 'lucide-react';

const BrandSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Overview', path: '/brand/overview', icon: LayoutDashboard },
    { name: 'Create Campaign', path: '/brand/campaigns/create', icon: PlusCircle },
    { name: 'Recommendations', path: '/brand/recommendations', icon: Users },
    { name: 'Analytics', path: '/brand/analytics', icon: BarChart3 },
    { name: 'About', path: '/brand/about', icon: Info },
  ];

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <TrendingUp size={20} />
        </div>
        <div className="sidebar-brand-text">
          Influencer<span>AI</span>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">Brand Dashboard</div>
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
          Platform
        </div>
        <div className="sidebar-info-box">
          <div className="sidebar-info-title">ML Model v2.4</div>
          <div className="sidebar-info-sub">Last trained: 2 hours ago</div>
          <div className="sidebar-progress-track">
            <div className="sidebar-progress-fill" style={{ width: '92%' }} />
          </div>
          <div className="sidebar-info-sub">Accuracy: 92%</div>
        </div>

        {user && (
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              {user.avatar}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">Brand Marketer</div>
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

export default BrandSidebar;
