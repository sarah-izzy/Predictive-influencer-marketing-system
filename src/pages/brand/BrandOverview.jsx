import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Target, TrendingUp, Users, DollarSign, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';
import Card from '../../components/common/Card';
import { influencers, engagementTrends, campaigns, categoryPerformance, platformData } from '../../data/dummyData';

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

const getScoreClass = (score) => {
  if (score >= 85) return 'score-high';
  if (score >= 70) return 'score-medium';
  return 'score-low';
};

const BrandOverview = () => {
  const [trendMetric, setTrendMetric] = useState('likes');

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const avgROI = Math.round(
    campaigns.filter(c => c.metrics.roi > 0).reduce((s, c) => s + c.metrics.roi, 0) /
    campaigns.filter(c => c.metrics.roi > 0).length
  );

  const top5 = useMemo(
    () => [...influencers].sort((a, b) => b.successScore - a.successScore).slice(0, 5),
    []
  );

  const campaignStatusData = [
    { name: 'Active', value: activeCampaigns, color: '#22c55e' },
    { name: 'Completed', value: completedCampaigns, color: '#6366f1' },
    { name: 'Draft', value: campaigns.filter(c => c.status === 'draft').length, color: '#4b5563' },
  ];

  return (
    <div>
      <h2 className="page-title">Brand Dashboard</h2>
      <p className="page-subtitle">Campaign performance and influencer insights at a glance</p>

      {/* Stat Cards */}
      <div className="stats-grid">
        <Card
          title="Active Campaigns"
          value={activeCampaigns}
          icon={Target}
          iconBg="linear-gradient(135deg, #22c55e, #4ade80)"
          glowColor="#22c55e"
          change="2 new"
          changeType="positive"
          subtext="Currently running"
        />
        <Card
          title="Avg. ROI"
          value={`${avgROI}%`}
          icon={TrendingUp}
          iconBg="linear-gradient(135deg, #6366f1, #818cf8)"
          glowColor="#6366f1"
          change="15.3%"
          changeType="positive"
          subtext="Across all campaigns"
        />
        <Card
          title="Total Influencers"
          value={influencers.length}
          icon={Users}
          iconBg="linear-gradient(135deg, #a855f7, #c084fc)"
          glowColor="#a855f7"
          change="8.2%"
          changeType="positive"
          subtext="In network"
        />
        <Card
          title="Budget Spent"
          value={`$${(totalSpent / 1000).toFixed(1)}K`}
          icon={DollarSign}
          iconBg="linear-gradient(135deg, #f97316, #fb923c)"
          glowColor="#f97316"
          subtext={`of $${(totalBudget / 1000).toFixed(1)}K total`}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="charts-grid">
        {/* Engagement Trends */}
        <div className="chart-card" style={{ animationDelay: '0.1s' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Engagement Trends</div>
              <div className="chart-card-subtitle">Monthly performance breakdown</div>
            </div>
            <div className="chart-card-actions">
              {['likes', 'comments', 'shares'].map((metric) => (
                <button
                  key={metric}
                  className={`chart-tab ${trendMetric === metric ? 'active' : ''}`}
                  onClick={() => setTrendMetric(metric)}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementTrends}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={trendMetric}
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#engGrad)"
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 2, stroke: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Status */}
        <div className="chart-card" style={{ animationDelay: '0.2s' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Campaign Status</div>
              <div className="chart-card-subtitle">Distribution of campaigns</div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={campaignStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {campaignStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
            {campaignStatusData.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                <span style={{ color: 'var(--gray-400)' }}>{s.name}</span>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Active campaigns summary */}
          <div style={{ marginTop: 16 }}>
            {campaigns.filter(c => c.status === 'active').map(c => (
              <div key={c.id} className="campaign-mini-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} style={{ color: 'var(--success-400)' }} />
                  <span style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 13 }}>{c.name}</span>
                </div>
                <span className="campaign-mini-badge">{c.metrics.roi}% ROI</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Influencers Table */}
      <div className="chart-card chart-full-width" style={{ animationDelay: '0.3s' }}>
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Top Recommended Influencers</div>
            <div className="chart-card-subtitle">Ranked by ML success score</div>
          </div>
        </div>
        <div className="rankings-table-wrapper">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Influencer</th>
                <th>Category</th>
                <th>Followers</th>
                <th>Engagement</th>
                <th>Predicted ROI</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((inf, idx) => (
                <tr key={inf.id}>
                  <td>
                    <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-default'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td>
                    <div className="influencer-info">
                      <div className="influencer-avatar" style={{ background: inf.color }}>
                        {inf.name.charAt(0)}
                      </div>
                      <div>
                        <div className="influencer-name">{inf.name}</div>
                        <div className="influencer-category">{inf.category} Niche</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`category-badge category-${inf.category.toLowerCase()}`}>
                      {inf.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                    {(inf.followers / 1000).toFixed(0)}K
                  </td>
                  <td>
                    <div className="engagement-bar-container">
                      <div className="engagement-bar">
                        <div
                          className="engagement-bar-fill"
                          style={{
                            width: `${(inf.engagement / 10) * 100}%`,
                            background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{inf.engagement}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ArrowUpRight size={14} style={{ color: 'var(--success-400)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--success-400)' }}>{inf.predictedROI}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`score-badge ${getScoreClass(inf.successScore)}`}>
                      {inf.successScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BrandOverview;
