import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, Target, DollarSign, Mail, ArrowUpRight } from 'lucide-react';
import Card from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { influencerPerformance, campaignInvitations, earningsData } from '../../data/dummyData';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="value" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const InfluencerOverview = () => {
  const { user } = useAuth();
  const latestPerf = influencerPerformance[influencerPerformance.length - 1];
  const pendingInvites = campaignInvitations.filter(i => i.status === 'pending');
  const totalEarnings = earningsData.reduce((s, e) => s + e.amount, 0);
  const activeCampaigns = campaignInvitations.filter(i => i.status === 'accepted').length;

  return (
    <div>
      <h2 className="page-title">Welcome back, {user?.name || 'Creator'} 👋</h2>
      <p className="page-subtitle">Your performance summary and latest updates</p>

      {/* Stat Cards */}
      <div className="stats-grid">
        <Card
          title="My Followers"
          value={`${(latestPerf.followers / 1000).toFixed(1)}K`}
          icon={Users}
          iconBg="linear-gradient(135deg, #f97316, #fb923c)"
          glowColor="#f97316"
          change="18.4%"
          changeType="positive"
          subtext="Total followers"
        />
        <Card
          title="Engagement Rate"
          value={`${latestPerf.engagement}%`}
          icon={TrendingUp}
          iconBg="linear-gradient(135deg, #22c55e, #4ade80)"
          glowColor="#22c55e"
          change="5.1%"
          changeType="positive"
          subtext="Last 30 days"
        />
        <Card
          title="Active Campaigns"
          value={activeCampaigns}
          icon={Target}
          iconBg="linear-gradient(135deg, #6366f1, #818cf8)"
          glowColor="#6366f1"
          subtext="Currently running"
        />
        <Card
          title="Total Earnings"
          value={`$${(totalEarnings / 1000).toFixed(1)}K`}
          icon={DollarSign}
          iconBg="linear-gradient(135deg, #a855f7, #c084fc)"
          glowColor="#a855f7"
          change="22.3%"
          changeType="positive"
          subtext="This year"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Recent Performance */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Your Engagement Trend</div>
              <div className="chart-card-subtitle">Monthly engagement rate</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={influencerPerformance}>
                <defs>
                  <linearGradient id="infEngGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="engagement" name="Engagement %" stroke="#f97316" strokeWidth={2} fill="url(#infEngGrad)" dot={{ r: 3, fill: '#f97316' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Pending Invitations</div>
              <div className="chart-card-subtitle">{pendingInvites.length} campaigns waiting for response</div>
            </div>
            <Mail size={18} style={{ color: 'var(--gray-500)' }} />
          </div>
          <div className="invite-summary-list">
            {pendingInvites.slice(0, 3).map(inv => (
              <div className="invite-summary-item" key={inv.id}>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{inv.campaignName}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{inv.brandName} · {inv.platform}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--success-400)', fontSize: 14 }}>
                    ${inv.budget.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                    Due {new Date(inv.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
            {pendingInvites.length === 0 && (
              <div className="empty-state" style={{ minHeight: 150 }}>
                <Mail size={32} />
                <p>No pending invitations</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Follower Growth */}
      <div className="chart-card chart-full-width">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Follower Growth</div>
            <div className="chart-card-subtitle">Monthly follower count</div>
          </div>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={influencerPerformance}>
              <defs>
                <linearGradient id="follGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="followers" name="Followers" stroke="#a855f7" strokeWidth={2} fill="url(#follGrad)" dot={{ r: 3, fill: '#a855f7' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InfluencerOverview;
