import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { getBrandDashboard, getRegisteredInfluencers } from '../../services/api';

const EMPTY_TRENDS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
].map((name) => ({ name, engagement: 0, conversion: 0, revenue: 0, campaigns: 0 }));

const PLATFORM_COLORS = ['#F97316', '#374151', '#F59E0B', '#EF4444', '#6B7280', '#FDBA74'];

const compactName = (name = '') => (name.length > 18 ? `${name.slice(0, 18)}...` : name);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label || payload[0]?.payload?.name}</p>
      {payload.map((entry, i) => {
        const rawValue = typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value;
        const isMoney = String(entry.dataKey || entry.name).toLowerCase().includes('revenue');
        return (
          <p key={i} className="value" style={{ color: entry.color }}>
            {entry.name}: {isMoney ? `₦${rawValue}` : rawValue}
          </p>
        );
      })}
    </div>
  );
};

const BrandAnalytics = () => {
  const [trendMetric, setTrendMetric] = useState('engagement');
  const [dashboard, setDashboard] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const [dashboardData, influencerData] = await Promise.all([
          getBrandDashboard(),
          getRegisteredInfluencers(),
        ]);
        setDashboard(dashboardData || {});
        setInfluencers(influencerData || []);
      } catch (err) {
        setError(err.message || 'Unable to load brand analytics.');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const campaigns = dashboard?.campaigns || [];
  const topRecommended = dashboard?.topRecommended || [];
  const engagementTrends = dashboard?.engagementTrends?.length ? dashboard.engagementTrends : EMPTY_TRENDS;

  const campaignROI = useMemo(() => campaigns
    .filter((campaign) => campaign.prediction_result || campaign.actualResults || Number(campaign.metrics?.roi || 0) !== 0)
    .map((campaign) => ({
      name: compactName(campaign.name),
      roi: Number(campaign.metrics?.roi || 0),
      revenue: Number(campaign.actualResults?.actual_revenue_usd || campaign.prediction_result?.pred_revenue_usd || 0),
    })), [campaigns]);

  const roiPredictions = useMemo(() => campaigns
    .filter((campaign) => campaign.prediction_result || campaign.actualResults)
    .map((campaign) => {
      const predicted = Number(campaign.prediction_result?.pred_roi_post_hoc || 0) * 100;
      const current = Number(campaign.actualResults?.actual_roi ?? campaign.metrics?.roi ?? predicted);
      return {
        name: compactName(campaign.name),
        current: Number(current.toFixed(1)),
        predicted: Number(predicted.toFixed(1)),
      };
    }), [campaigns]);

  const categoryPerformance = useMemo(() => {
    const groups = new Map();
    campaigns.forEach((campaign) => {
      const category = campaign.category || campaign.payload?.brandCategory || 'Lifestyle';
      const current = groups.get(category) || { category, totalROI: 0, totalRevenue: 0, campaigns: 0 };
      current.totalROI += Number(campaign.metrics?.roi || 0);
      current.totalRevenue += Number(campaign.actualResults?.actual_revenue_usd || campaign.prediction_result?.pred_revenue_usd || 0);
      current.campaigns += 1;
      groups.set(category, current);
    });
    return Array.from(groups.values())
      .map((item) => ({
        category: item.category,
        avgROI: item.campaigns ? Number((item.totalROI / item.campaigns).toFixed(1)) : 0,
        revenue: Number(item.totalRevenue.toFixed(0)),
        campaigns: item.campaigns,
      }))
      .sort((a, b) => b.avgROI - a.avgROI);
  }, [campaigns]);

  const platformData = useMemo(() => {
    const counts = new Map();
    influencers.forEach((influencer) => {
      const platform = influencer.profile?.platform || influencer.platform || 'Instagram';
      counts.set(platform, (counts.get(platform) || 0) + 1);
    });
    const total = influencers.length || 1;
    return Array.from(counts.entries()).map(([name, count], index) => ({
      name,
      count,
      value: Number(((count / total) * 100).toFixed(1)),
      color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
    }));
  }, [influencers]);

  const scatterData = useMemo(() => {
    const recommended = topRecommended.map((rec, index) => ({
      name: rec.influencer_id || rec.username || `Influencer ${index + 1}`,
      engagement: Number(rec.pred_er || 0),
      roi: Number(rec.pred_roi || 0) * 100,
      followers: Number(rec.followers_count || 0),
      color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
    }));
    if (recommended.length) return recommended;
    return influencers.map((influencer, index) => ({
      name: influencer.name,
      engagement: Number(influencer.profile?.engagementRate || influencer.profile?.engagement || 0),
      roi: 0,
      followers: Number(influencer.followers || influencer.profile?.followersCount || 0),
      color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
    }));
  }, [topRecommended, influencers]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading brand analytics...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Analytics</h2>
      <p className="page-subtitle">Live campaign and influencer performance from the backend database</p>

      {error && (
        <div className="glass-card" style={{ marginBottom: 16, padding: '12px 20px', borderLeft: '3px solid var(--danger-500)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-900)', fontSize: 13 }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Campaign Trends</div>
              <div className="chart-card-subtitle">Monthly averages from saved campaign predictions</div>
            </div>
            <div className="chart-card-actions">
              {['engagement', 'conversion', 'revenue'].map((metric) => (
                <button key={metric} className={`chart-tab ${trendMetric === metric ? 'active' : ''}`} onClick={() => setTrendMetric(metric)}>
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
                <Area type="monotone" dataKey={trendMetric} name={trendMetric === 'revenue' ? 'Revenue' : trendMetric} stroke="#F97316" strokeWidth={2} fill="rgba(249, 115, 22, 0.14)" dot={{ r: 3, fill: '#F97316' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Campaign ROI</div>
              <div className="chart-card-subtitle">ROI by campaign from predictions or evaluations</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignROI} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="roi" name="ROI %" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">ROI: Current vs Predicted</div>
              <div className="chart-card-subtitle">Compares evaluation ROI against ML forecast</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiPredictions} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="current" name="Current ROI" fill="#374151" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="predicted" name="Predicted ROI" fill="#F97316" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="roi-cards-grid">
            {roiPredictions.slice(0, 3).map((item) => (
              <div className="roi-card" key={item.name}>
                <div className="roi-value" style={{ color: 'var(--gray-900)' }}>
                  {item.predicted - item.current >= 0 ? '+' : ''}{(item.predicted - item.current).toFixed(1)}%
                </div>
                <div className="roi-label">{item.name} variance</div>
              </div>
            ))}
            {roiPredictions.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1', minHeight: 80 }}>
                <BarChart3 size={24} />
                <p>No prediction ROI data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Category Performance</div>
              <div className="chart-card-subtitle">Average ROI by campaign category</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="category" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgROI" name="Avg ROI %" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Platform Distribution</div>
              <div className="chart-card-subtitle">Registered influencers by primary platform</div>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {platformData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 4 }}>
            {platformData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                <span style={{ color: 'var(--gray-600)' }}>{item.name}</span>
                <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.count}</span>
              </div>
            ))}
            {platformData.length === 0 && <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>No registered influencers yet</span>}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Engagement vs. ROI</div>
              <div className="chart-card-subtitle">Bubble size = follower count</div>
            </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis type="number" dataKey="engagement" name="Engagement" unit="%" stroke="#4b5563" fontSize={12} tickLine={false} />
                <YAxis type="number" dataKey="roi" name="ROI" unit="%" stroke="#4b5563" fontSize={12} tickLine={false} />
                <ZAxis type="number" dataKey="followers" range={[60, 400]} />
                <Tooltip content={<CustomTooltip />} />
                <Scatter data={scatterData} name="Influencers">
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandAnalytics;
