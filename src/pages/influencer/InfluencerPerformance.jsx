import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getInfluencerProfile } from '../../services/api';
import { buildContentPerformanceFromProfile, buildInfluencerPerformanceFromProfile } from '../../utils/influencerProfileMetrics';

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

const InfluencerPerformance = () => {
  const [metric, setMetric] = useState('likes');
  const [profile, setProfile] = useState(null);
  const influencerPerformance = useMemo(
    () => buildInfluencerPerformanceFromProfile(profile || {}),
    [profile]
  );
  const contentPerformance = useMemo(
    () => buildContentPerformanceFromProfile(profile || {}),
    [profile]
  );

  useEffect(() => {
    const loadProfile = async () => {
      const data = await getInfluencerProfile();
      setProfile(data || null);
    };
    loadProfile();
  }, []);

  const latestPerf = influencerPerformance[influencerPerformance.length - 1];
  const prevPerf = influencerPerformance[influencerPerformance.length - 2];
  const pctChange = (current, previous) => {
    if (!previous) return '0.0%';
    const value = ((current - previous) / previous) * 100;
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const growthMetrics = [
    {
      label: 'Follower Growth',
      value: pctChange(latestPerf.followers, prevPerf.followers),
      color: 'var(--gray-900)',
    },
    {
      label: 'Engagement Change',
      value: pctChange(latestPerf.engagement, prevPerf.engagement),
      color: 'var(--gray-900)',
    },
    {
      label: 'Reach Growth',
      value: pctChange(latestPerf.reach, prevPerf.reach),
      color: 'var(--gray-900)',
    },
    {
      label: 'Avg Likes Change',
      value: pctChange(latestPerf.likes, prevPerf.likes),
      color: 'var(--gray-900)',
    },
  ];

  return (
    <div>
      <h2 className="page-title">Performance Analytics</h2>
      <p className="page-subtitle">Your content performance metrics and growth insights</p>

      {/* Growth Cards */}
      <div className="stats-grid">
        {growthMetrics.map((g, i) => (
          <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-card-glow" style={{ background: g.color }} />
            <div className="stat-card-value" style={{ color: g.color, fontSize: 24 }}>{g.value}</div>
            <div className="stat-card-label">{g.label}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>vs last month</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="charts-grid">
        {/* Engagement Over Time */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Your Metrics Over Time</div>
              <div className="chart-card-subtitle">Select a metric to view trend</div>
            </div>
            <div className="chart-card-actions">
              {['likes', 'comments', 'reach'].map(m => (
                <button key={m} className={`chart-tab ${metric === m ? 'active' : ''}`} onClick={() => setMetric(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={influencerPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={metric} name={metric.charAt(0).toUpperCase() + metric.slice(1)} stroke="#F97316" strokeWidth={2} fill="rgba(249, 115, 22, 0.14)" dot={{ r: 3, fill: '#F97316' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Performance by Type */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Content Performance</div>
              <div className="chart-card-subtitle">Average metrics by content type</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentPerformance} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="type" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgLikes" name="Avg Likes" fill="rgba(249, 115, 22, 0.14)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Content Type Breakdown Table */}
      <div className="chart-card chart-full-width">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Content Type Breakdown</div>
            <div className="chart-card-subtitle">Detailed metrics per content format</div>
          </div>
        </div>
        <div className="rankings-table-wrapper">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Content Type</th>
                <th>Total Posts</th>
                <th>Avg Likes</th>
                <th>Avg Comments</th>
                <th>Avg Reach</th>
              </tr>
            </thead>
            <tbody>
              {contentPerformance.map(c => (
                <tr key={c.type}>
                  <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{c.type}</td>
                  <td style={{ color: 'var(--gray-700)' }}>{c.posts}</td>
                  <td style={{ color: 'var(--gray-700)' }}>{c.avgLikes.toLocaleString()}</td>
                  <td style={{ color: 'var(--gray-700)' }}>{c.avgComments.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success-400)' }}>{(c.avgReach / 1000).toFixed(0)}K</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InfluencerPerformance;
