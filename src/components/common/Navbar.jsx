import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  BrainCircuit,
  BarChart3,
  Info,
  TrendingUp,
} from 'lucide-react';

const Navbar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Prediction', path: '/prediction', icon: BrainCircuit },
    { name: 'Analysis', path: '/analysis', icon: BarChart3 },
    { name: 'About', path: '/about', icon: Info },
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
          background: 'rgba(99, 102, 241, 0.06)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
            ML Model v2.4
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
            Last trained: 2 hours ago
          </div>
          <div style={{
            marginTop: 8,
            height: 4,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              width: '92%',
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
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