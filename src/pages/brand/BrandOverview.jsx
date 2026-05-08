import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight, Banknote, Clock, Target, TrendingUp, Users } from 'lucide-react';
import Card from '../../components/common/Card';
import {
  completeCampaign,
  getBrandDashboard,
} from '../../services/api';

const EMPTY_ENGAGEMENT_TRENDS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
].map((name) => ({ name, engagement: 0, conversion: 0, revenue: 0, campaigns: 0 }));

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
  const [trendMetric, setTrendMetric] = useState('engagement');
  const [topRecommended, setTopRecommended] = useState([]);
  const [campaignsData, setCampaignsData] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [statusData, setStatusData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    engagementTrends: EMPTY_ENGAGEMENT_TRENDS,
  });

  // Load data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const dashboard = await getBrandDashboard();
        setDashboardStats(dashboard.stats || {});
        setCampaignsData(dashboard.campaigns || []);
        setStatusData(dashboard.campaignStatus || []);
        setTopRecommended((dashboard.topRecommended || []).map((rec, idx) => ({
          id: rec.influencer_user_id || rec.username || rec.influencer_id || idx,
          name: rec.influencer_id,
          category: rec.niche,
          followers: Number(rec.followers_count || 0),
          engagement: Number(rec.pred_er || 0).toFixed(2),
          predictedROI: Math.round(Number(rec.pred_roi || 0) * 100),
          successScore: Math.round(Number(rec.pred_success || 0) * 100),
          color: '#F97316',
          platform: rec.platform,
        })));
        setAnalyticsData({
          engagementTrends: dashboard.engagementTrends?.length
            ? dashboard.engagementTrends
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
    return trends.length ? trends : EMPTY_ENGAGEMENT_TRENDS;
  }, [analyticsData]);
  const activeCampaigns = Number(dashboardStats.activeCampaigns || 0);
  const completedCampaigns = Number(dashboardStats.completedCampaigns || 0);
  const totalBudget = Number(dashboardStats.totalBudget || 0);
  const totalSpent = Number(dashboardStats.budgetSpent || 0);
  const avgROI = Number(dashboardStats.avgROI || 0);
  const influencerCount = Number(dashboardStats.totalInfluencers || 0);
  const selectedInfluencerCount = Number(dashboardStats.selectedInfluencers || 0);
  const campaignsCreated = Number(dashboardStats.campaignsCreated || campaignsData.length || 0);
  const top5 = useMemo(
    () => topRecommended.slice(0, 5),
    [topRecommended]
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
    { name: 'Active', value: statusData.find(s => s.name === 'Active')?.value ?? activeCampaigns, color: '#F97316' },
    { name: 'Completed', value: statusData.find(s => s.name === 'Completed')?.value ?? completedCampaigns, color: '#F59E0B' },
    { name: 'Draft/Recommended', value: statusData.find(s => s.name === 'Draft/Recommended')?.value ?? 0, color: '#EF4444' },
  ];

  return (
    <div>
      <h2 className="page-title">Brand Dashboard</h2>
      <p className="page-subtitle">Campaign performance and influencer insights at a glance</p>

      {/* Stat Cards */}
      <div className="stats-grid">
        <Card
          title="Campaigns Created"
          value={campaignsCreated}
          icon={Target}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext={`${activeCampaigns} active`}
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
          value={influencerCount}
          icon={Users}
          iconBg="var(--accent-500)"
          glowColor="#F97316"
          subtext={selectedInfluencerCount ? 'Invited or selected' : 'Registered'}
        />
        <Card
          title="Budget Spent"
          value={`₦${(totalSpent / 1000).toFixed(1)}K`}
          icon={Banknote}
          iconBg="var(--primary-600)"
          glowColor="#F97316"
          subtext={`of ₦${(totalBudget / 1000).toFixed(1)}K total`}
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
              {['engagement', 'conversion', 'revenue'].map((metric) => (
                <button
                  key={metric}
                  className={`chart-tab ${trendMetric === metric ? 'active' : ''}`}
                  onClick={() => setTrendMetric(metric)}
                >
                  {metric === 'revenue' ? 'Revenue' : `${metric.charAt(0).toUpperCase() + metric.slice(1)} Rate`}
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
              <div className="chart-card-subtitle">{campaignsCreated} campaigns in the database</div>
            </div>
          </div>
          <div className="campaign-status-panel">
            <div className="campaign-status-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={campaignStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={66}
                    outerRadius={100}
                    paddingAngle={3}
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
              <div className="campaign-status-center">
                <strong>{campaignsCreated}</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="campaign-status-metrics">
              {campaignStatusData.map((s) => (
                <div key={s.name} className="campaign-status-metric">
                  <span style={{ background: s.color }} />
                  <div>
                    <strong>{s.value}</strong>
                    <p>{s.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="campaign-status-list">
            {campaignsData.filter(c => ['active', 'launched', 'selected', 'recommended', 'draft'].includes(c.status)).slice(0, 5).map(c => (
              <div key={c.id} className="campaign-status-row">
                <div className="campaign-status-row-main">
                  <Clock size={14} />
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.category} / ₦{Number(c.budget || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="campaign-status-row-actions">
                  <span className={`campaign-status-pill campaign-status-${c.status}`}>
                    {c.status}
                  </span>
                  {c.status === 'launched' && (
                    <button className="btn-edit" style={{ padding: '5px 8px' }} onClick={() => handleCompleteCampaign(c)}>
                      Evaluate
                    </button>
                  )}
                </div>
              </div>
            ))}
            {campaignsData.length === 0 && (
              <div className="empty-state" style={{ minHeight: 120 }}>
                <Target size={28} />
                <p>No campaigns created yet</p>
              </div>
            )}
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
              {top5.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 24 }}>
                    No campaign recommendations yet. Create a campaign prediction to rank influencers from the database.
                  </td>
                </tr>
              )}
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
