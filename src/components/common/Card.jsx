import React from 'react';

const Card = ({ title, value, subtext, icon: Icon, iconBg, change, changeType, glowColor }) => (
  <div className="stat-card">
    <div className="stat-card-glow" style={{ background: glowColor || 'var(--primary-500)' }} />
    <div className="stat-card-header">
      <div className="stat-card-icon" style={{ background: iconBg || 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' }}>
        {Icon && <Icon size={20} />}
      </div>
      {change && (
        <div className={`stat-card-change ${changeType === 'positive' ? 'positive' : 'negative'}`}>
          {changeType === 'positive' ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
    <div className="stat-card-value">{value}</div>
    <div className="stat-card-label">{title}</div>
    {subtext && <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>{subtext}</div>}
  </div>
);

export default Card;