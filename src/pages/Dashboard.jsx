import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Users, TrendingUp, DollarSign, Target, ArrowUpRight, Eye } from 'lucide-react';
import Card from '../components/common/Card';
import { influencers, engagementTrends, roiPredictions, categoryPerformance, platformData } from '../data/dummyData';

/* Custom chart tooltip */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
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

/* Category badge helper */
const getCategoryClass = (cat) => `category-${cat.toLowerCase()}`;

/* Score badge helper */
const getScoreClass = (score) => {
  if (score >= 85) return 'score-high';
  if (score >= 70) return 'score-medium';
  return 'score-low';
};

/* Sort influencers by successScore desc */
const rankedInfluencers = [...influencers].sort((a, b) => b.successScore - a.successScore);

const Dashboard = () => {
  const [engagementMetric, setEngagementMetric] = useState('likes');

  /* Aggregate stats */
  const totalFollowers = influencers.reduce((sum, i) => sum + i.followers, 0);
  const avgEngagement = (influencers.reduce((sum, i) => sum + i.engagement, 0) / influencers.length).toFixed(1);
  const avgROI = Math.round(influencers.reduce((sum, i) => sum + i.predictedROI, 0) / influencers.length);
  const totalCampaigns = 24;

  /* Radial data for ROI */
  const roiRadialData = roiPredictions.map((r, i) => ({
    name: r.name,
    predicted: r.predicted,
    fill: influencers[i]?.color || '#6366f1',
  }));

  return (
    <div>
      <h2 className="page-title">Analytics Dashboard</h2>
      <p className="page-subtitle">Real-time influencer performance insights and predictive analytics</p>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        <Card
          title="Total Followers"
          value={`${(totalFollowers / 1000).toFixed(0)}K`}
          icon={Users}
          iconBg="linear-gradient(135deg, #6366f1, #818cf8)"
          glowColor="#6366f1"
          change="12.5%"
          changeType="positive"
          subtext="Across tracked influencers"
        />
        <Card
          title="Avg. Engagement"
          value={`${avgEngagement}%`}
          icon={TrendingUp}
          iconBg="linear-gradient(135deg, #22c55e, #4ade80)"
          glowColor="#22c55e"
          change="8.2%"
          changeType="positive"
          subtext="Last 30 days"
        />
        <Card
          title="Predicted ROI"
          value={`${avgROI}%`}
          icon={DollarSign}
          iconBg="linear-gradient(135deg, #a855f7, #c084fc)"
          glowColor="#a855f7"
          change="15.3%"
          changeType="positive"
          subtext="ML model forecast"
        />
        <Card
          title="Active Campaigns"
          value={totalCampaigns}
          icon={Target}
          iconBg="linear-gradient(135deg, #f97316, #fb923c)"
          glowColor="#f97316"
          change="3.1%"
          changeType="negative"
          subtext="Currently running"
        />
      </div>

      {/* ── Charts Row ── */}
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
                  className={`chart-tab ${engagementMetric === metric ? 'active' : ''}`}
                  onClick={() => setEngagementMetric(metric)}
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
                  <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey={engagementMetric}
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#engagementGrad)"
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 2, stroke: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Performance */}
        <div className="chart-card" style={{ animationDelay: '0.2s' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Category Performance</div>
              <div className="chart-card-subtitle">Average ROI by niche</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgROI" name="Avg ROI %" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Predicted ROI + Platform Split ── */}
      <div className="charts-grid">
        {/* ROI Predictions */}
        <div className="chart-card" style={{ animationDelay: '0.3s' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Predicted ROI Values</div>
              <div className="chart-card-subtitle">Current vs. ML-predicted ROI</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiPredictions} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="current" name="Current ROI" fill="#374151" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="predicted" name="Predicted ROI" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>    
          <div className="roi-cards-grid">
            {roiPredictions.slice(0, 3).map((r) => (
              <div className="roi-card" key={r.name}>
                <div className="roi-value" style={{ color: '#22c55e' }}>+{r.predicted - r.current}%</div>
                <div className="roi-label">{r.name} growth</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="chart-card" style={{ animationDelay: '0.4s' }}>
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Platform Distribution</div>
              <div className="chart-card-subtitle">Influencers across platforms</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap',
            marginTop: 8,
          }}>
            {platformData.map((p) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: p.color,
                  display: 'inline-block',
                }} />
                <span style={{ color: 'var(--gray-400)' }}>{p.name}</span>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Influencer Rankings Table ── */}
      <div className="chart-card chart-full-width" style={{ animationDelay: '0.5s' }}>
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Influencer Rankings</div>
            <div className="chart-card-subtitle">Ranked by AI success score</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={16} style={{ color: 'var(--gray-500)' }} />
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{influencers.length} Influencers</span>
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
              {rankedInfluencers.map((inf, idx) => (
                <tr key={inf.id}>
                  <td>
                    <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-default'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td>
                    <div className="influencer-info">
                      <div
                        className="influencer-avatar"
                        style={{ background: inf.color }}
                      >
                        {inf.name.charAt(0)}
                      </div>
                      <div>
                        <div className="influencer-name">{inf.name}</div>
                        <div className="influencer-category">{inf.category} Niche</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`category-badge ${getCategoryClass(inf.category)}`}>
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
                            background: `linear-gradient(90deg, var(--primary-500), var(--accent-500))`,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {inf.engagement}%
                      </span>
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

export default Dashboard;