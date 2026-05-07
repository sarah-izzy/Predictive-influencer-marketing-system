import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Mail, DollarSign, Calendar } from 'lucide-react';
import { campaignInvitations } from '../../data/dummyData';
import { getInvitations, respondToInvitation } from '../../services/api';

const Invitations = () => {
  const [tab, setTab] = useState('pending');
  const [invitations, setInvitations] = useState(campaignInvitations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvitations = async () => {
      const data = await getInvitations();
      setInvitations(data.length ? data : campaignInvitations);
      setLoading(false);
    };
    loadInvitations();
  }, []);

  const filtered = useMemo(
    () => invitations.filter(inv => inv.status === tab),
    [invitations, tab]
  );

  const handleAction = async (id, action) => {
    try {
      await respondToInvitation(id, action);
      setInvitations(prev =>
        prev.map(inv => inv.id === id ? { ...inv, status: action } : inv)
      );
    } catch {
      setInvitations(prev =>
        prev.map(inv => inv.id === id ? { ...inv, status: action } : inv)
      );
    }
  };

  const tabs = [
    { key: 'pending', label: 'Pending', icon: Clock, count: invitations.filter(i => i.status === 'pending').length },
    { key: 'accepted', label: 'Accepted', icon: CheckCircle2, count: invitations.filter(i => i.status === 'accepted').length },
    { key: 'declined', label: 'Declined', icon: XCircle, count: invitations.filter(i => i.status === 'declined').length },
  ];

  const statusColors = {
    pending: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.24)', color: 'var(--warning-400)' },
    accepted: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.24)', color: 'var(--success-400)' },
    declined: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.24)', color: 'var(--danger-400)' },
  };

  return (
    <div>
      <h2 className="page-title">Campaign Invitations</h2>
      <p className="page-subtitle">Manage campaign invitations from brands</p>

      {loading && (
        <div className="glass-card" style={{ marginBottom: 16, padding: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>Loading platform invitations...</div>
        </div>
      )}

      {/* Tabs */}
      <div className="inv-tabs">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`inv-tab ${tab === t.key ? 'inv-tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <Icon size={16} />
              {t.label}
              {t.count > 0 && <span className="inv-tab-count">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Invitation Cards */}
      <div className="inv-grid">
        {filtered.length === 0 ? (
          <div className="glass-card empty-state" style={{ gridColumn: '1 / -1', minHeight: 250 }}>
            <Mail size={48} />
            <p style={{ marginTop: 8 }}>No {tab} invitations</p>
          </div>
        ) : (
          filtered.map(inv => (
            <div className="inv-card glass-card" key={inv.id}>
              <div className="inv-card-header">
                <div>
                  <div className="inv-card-title">{inv.campaignName}</div>
                  <div className="inv-card-brand">{inv.brandName}</div>
                </div>
                <span
                  className="inv-status-badge"
                  style={{
                    background: statusColors[inv.status].bg,
                    borderColor: statusColors[inv.status].border,
                    color: statusColors[inv.status].color,
                  }}
                >
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </span>
              </div>

              <p className="inv-card-desc">{inv.description}</p>

              <div className="inv-card-meta">
                <div className="inv-meta-item">
                  <DollarSign size={14} />
                  <span>${inv.budget.toLocaleString()}</span>
                </div>
                <div className="inv-meta-item">
                  <span className={`category-badge category-${inv.category.toLowerCase()}`}>
                    {inv.category}
                  </span>
                </div>
                <div className="inv-meta-item">
                  <Calendar size={14} />
                  <span>Due {new Date(inv.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              {inv.status === 'pending' && (
                <div className="inv-card-actions">
                  <button className="inv-btn inv-btn-accept" onClick={() => handleAction(inv.id, 'accepted')}>
                    <CheckCircle2 size={16} />
                    Accept
                  </button>
                  <button className="inv-btn inv-btn-decline" onClick={() => handleAction(inv.id, 'declined')}>
                    <XCircle size={16} />
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Invitations;
