import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInvitations } from '../../services/api';

const InfluencerOverview = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    const loadInvitations = async () => {
      const invitationData = await getInvitations();
      setInvitations(invitationData || []);
    };
    loadInvitations();
  }, []);

  const pendingInvites = invitations.filter((invite) => invite.status === 'pending');

  return (
    <div>
      <h2 className="page-title">Welcome back, {user?.name || 'Creator'}</h2>
      <p className="page-subtitle">Your latest campaign invitations</p>

      <div className="chart-card chart-full-width">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Pending Invitations</div>
            <div className="chart-card-subtitle">{pendingInvites.length} campaigns waiting for response</div>
          </div>
          <Mail size={18} style={{ color: 'var(--gray-500)' }} />
        </div>
        <div className="invite-summary-list">
          {pendingInvites.slice(0, 5).map((inv) => (
            <div className="invite-summary-item" key={inv.id}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: 14 }}>{inv.campaignName}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{inv.brandName} / {inv.platform}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, color: 'var(--success-400)', fontSize: 14 }}>
                  ${Number(inv.budget || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                  Due {new Date(inv.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
          {pendingInvites.length === 0 && (
            <div className="empty-state" style={{ minHeight: 220 }}>
              <Mail size={32} />
              <p>No pending invitations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfluencerOverview;
