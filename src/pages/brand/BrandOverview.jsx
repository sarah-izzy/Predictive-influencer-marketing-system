import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight, Clock, DollarSign, Target, TrendingUp, Users } from 'lucide-react';
import Card from '../../components/common/Card';
import { checkHealth, completeCampaign, getAnalytics, getCampaigns, getInfluencers } from '../../services/api';

const EMPTY_ENGAGEMENT_TRENDS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
].map((name) => ({ name, likes: 0, comments: 0, shares: 0 }));

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
  const [influencersData, setInfluencersData] = useState([]);
  const [campaignsData, setCampaignsData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    engagementTrends: EMPTY_ENGAGEMENT_TRENDS,
  });

  // Load data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const campaigns = await getCampaigns();
        setCampaignsData(campaigns);

        const health = await checkHealth();
        if (!health.trained) return;

        const [influencers, analytics] = await Promise.all([
          getInfluencers(),
          getAnalytics()
        ]);
        if (influencers.length) {
          setInfluencersData(influencers);
        }
        setAnalyticsData({
          engagementTrends: analytics.engagementTrends?.length
            ? analytics.engagementTrends
            : EMPTY_ENGAGEMENT_TRENDS,
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const engagementTrends = useMemo(() => {
    const trends = analyticsData?.engagementTrends || [];
    if (!trends.length) return [];
    const baseline = trends[0];
    return trends.map((entry) => ({
      ...entry,
      likes: baseline.likes,
      comments: baseline.comments,
      shares: baseline.shares,
    }));
  }, [analyticsData]);
  const activeCampaigns = campaignsData.filter(c => ['active', 'launched'].includes(c.status)).length;
  const completedCampaigns = campaignsData.filter(c => c.status === 'completed').length;
  const totalBudget = campaignsData.reduce((s, c) => s + Number(c.budget || 0), 0);
  const totalSpent = campaignsData.reduce((s, c) => s + Number(c.spent || 0), 0);
  const roiCampaigns = campaignsData.filter(c => Number(c.metrics?.roi || 0) > 0);
  const avgROI = roiCampaigns.length
    ? Math.round(roiCampaigns.reduce((s, c) => s + Number(c.metrics?.roi || 0), 0) / roiCampaigns.length)
    : 0;
  const top5 = useMemo(
    () => [...influencersData].sort((a, b) => b.successScore - a.successScore).slice(0, 5),
    [influencersData]
  );

  const handleCompleteCampaign = async (campaign) => {
    const predicted = campaign.prediction_result || {};
    const engagement = Number(campaign.metrics?.engagement || predicted.pred_engagement_rate || 4.5);
    const revenue = Number(predicted.pred_revenue_usd || campaign.budget * 1.6 || 5000);
    const roi = campaign.budget ? ((revenue - campaign.budget) / campaign.budget) * 100 : Number(campaign.metrics?.roi || 0);
    try {
      const result = await completeCampaign(campaign.id, {
        actual_engagement_rate: Number(engagement.toFixed(2)),
        actual_conversion_rate: Number((predicted.pred_conversion_rate || 2.4).toFixed(2)),
        actual_revenue_usd: Number(revenue.toFixed(2)),
        actual_roi: Number(roi.toFixed(2)),
        notes: 'Stored from dashboard evaluation workflow.',
      });
      setCampaignsData((prev) => prev.map((item) => item.id === campaign.id ? result.campaign : item));
    } catch (error) {
      alert(error.message || 'Unable to complete campaign');
    }
  };

  const campaignStatusData = [
    { name: 'Launched', value: activeCampaigns, color: '#F97316' },
    { name: 'Completed', value: completedCampaigns, color: '#FDBA74' },
    { name: 'Draft/Selected', value: campaignsData.filter(c => ['draft', 'recommended', 'selected'].includes(c.status)).length, color: '#9A3412' },
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
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext="Currently running"
        />
        <Card
          title="Avg. ROI"
          value={`${avgROI}%`}
          icon={TrendingUp}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext="Across all campaigns"
        />
        <Card
          title="Total Influencers"
          value={influencersData.length}
          icon={Users}
          iconBg="var(--accent-500)"
          glowColor="#F97316"
          subtext="In network"
        />
        <Card
          title="Budget Spent"
          value={`$${(totalSpent / 1000).toFixed(1)}K`}
          icon={DollarSign}
          iconBg="var(--warning-500)"
          glowColor="#F97316"
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={trendMetric}
                  stroke="var(--primary-600)"
                  strokeWidth={2}
                  fill="rgba(249, 115, 22, 0.14)"
                  dot={{ r: 3, fill: 'var(--primary-600)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--primary-400)', strokeWidth: 2, stroke: 'var(--primary-600)' }}
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
                <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Active campaigns summary */}
          <div style={{ marginTop: 16 }}>
            {campaignsData.filter(c => ['active', 'launched', 'selected', 'recommended'].includes(c.status)).slice(0, 4).map(c => (
              <div key={c.id} className="campaign-mini-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} style={{ color: 'var(--primary-700)' }} />
                  <span style={{ fontWeight: 500, color: 'var(--gray-900)', fontSize: 13 }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="campaign-mini-badge">{c.status}</span>
                  {c.status === 'launched' && (
                    <button className="btn-edit" style={{ padding: '5px 8px' }} onClick={() => handleCompleteCampaign(c)}>
                      Evaluate
                    </button>
                  )}
                </div>
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
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                    {(inf.followers / 1000).toFixed(0)}K
                  </td>
                  <td>
                    <div className="engagement-bar-container">
                      <div className="engagement-bar">
                        <div
                          className="engagement-bar-fill"
                          style={{
                            width: `${(inf.engagement / 10) * 100}%`,
                            background: 'var(--primary-600)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{inf.engagement}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ArrowUpRight size={14} style={{ color: 'var(--primary-700)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>{inf.predictedROI}%</span>
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
