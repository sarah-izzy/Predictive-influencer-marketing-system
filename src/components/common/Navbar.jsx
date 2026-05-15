import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  PlusCircle,
  BarChart3,
  Info,
  TrendingUp,
  Users,
} from 'lucide-react';

const Navbar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Brand Overview', path: '/brand/overview', icon: LayoutDashboard },
    { name: 'Create Campaign', path: '/brand/campaigns/create', icon: PlusCircle },
    { name: 'Recommendations', path: '/brand/recommendations', icon: Users },
    { name: 'Analytics', path: '/brand/analytics', icon: BarChart3 },
    { name: 'About', path: '/brand/about', icon: Info },
  ];

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <TrendingUp size={20} />
        </div>
        <div className="sidebar-brand-text">
          Influencer<span>AI</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
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
        <div style={{
          padding: '12px 16px',
          background: 'rgba(249, 115, 22, 0.08)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(249, 115, 22, 0.14)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 4 }}>
            ML Model v2.4
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
            Last trained: 2 hours ago
          </div>
          <div style={{
            marginTop: 8,
            height: 4,
            background: 'var(--gray-200)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: '92%',
              height: '100%',
              background: 'var(--primary-600)',
              borderRadius: 2,
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>
            Accuracy: 92%
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
