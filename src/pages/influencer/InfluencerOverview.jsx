import { useEffect, useState } from 'react';
import { Banknote, Mail, Target, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import { getInfluencerDashboard } from '../../services/api';

const InfluencerOverview = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    const loadDashboard = async () => {
      const dashboard = await getInfluencerDashboard();
      setStats(dashboard.stats || {});
      setInvitations(dashboard.pendingInvitations || []);
    };
    loadDashboard();
  }, []);

  const pendingInvites = invitations;

  return (
    <div>
      <h2 className="page-title">Welcome back, {user?.name || 'Creator'}</h2>
      <p className="page-subtitle">Your latest campaign activity from the database</p>

      <div className="stats-grid">
        <Card
          title="My Followers"
          value={Number(stats.followers || 0).toLocaleString()}
          icon={Users}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext="Saved profile count"
        />
        <Card
          title="Engagement Rate"
          value={`${Number(stats.engagementRate || 0).toFixed(1)}%`}
          icon={TrendingUp}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext="Saved profile metric"
        />
        <Card
          title="Active Campaigns"
          value={Number(stats.activeCampaigns || 0)}
          icon={Target}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext="Accepted invitations"
        />
        <Card
          title="Total Earnings"
          value={`₦${(Number(stats.totalEarnings || 0) / 1000).toFixed(1)}K`}
          icon={Banknote}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext="Accepted campaign budgets"
        />
      </div>

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
                  ₦{Number(inv.budget || 0).toLocaleString()}
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
