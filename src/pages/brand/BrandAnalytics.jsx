import { useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { influencers, engagementTrends, roiPredictions, categoryPerformance, platformData, campaigns } from '../../data/dummyData';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="label">{label || payload[0]?.payload?.name}</p>
      {payload.map((entry, i) => (
        <p key={i} className="value" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

const BrandAnalytics = () => {
  const [engMetric, setEngMetric] = useState('likes');

  const campaignROI = campaigns
    .filter(c => c.metrics.roi > 0)
    .map(c => ({ name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name, roi: c.metrics.roi, reach: c.metrics.reach / 1000 }));

  const scatterData = influencers.map(inf => ({
    name: inf.name,
    engagement: inf.engagement,
    roi: inf.predictedROI,
    followers: inf.followers,
    color: inf.color,
  }));

  return (
    <div>
      <h2 className="page-title">Analytics</h2>
      <p className="page-subtitle">Deep-dive into campaign and influencer performance data</p>

      {/* Row 1 */}
      <div className="charts-grid">
        {/* Engagement Trends */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Engagement Trends</div>
              <div className="chart-card-subtitle">Monthly performance over time</div>
            </div>
            <div className="chart-card-actions">
              {['likes', 'comments', 'shares'].map(m => (
                <button key={m} className={`chart-tab ${engMetric === m ? 'active' : ''}`} onClick={() => setEngMetric(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementTrends}>
                <defs>
                  <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={engMetric} stroke="#6366f1" strokeWidth={2} fill="url(#analyticsGrad)" dot={{ r: 3, fill: '#6366f1' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign ROI */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Campaign ROI</div>
              <div className="chart-card-subtitle">ROI% by campaign</div>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignROI} barSize={28}>
                <defs>
                  <linearGradient id="roiBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="roi" name="ROI %" fill="url(#roiBarGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="charts-grid">
        {/* ROI Predictions */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">ROI: Current vs Predicted</div>
              <div className="chart-card-subtitle">ML forecast comparison</div>
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
            {roiPredictions.slice(0, 3).map(r => (
              <div className="roi-card" key={r.name}>
                <div className="roi-value" style={{ color: '#22c55e' }}>+{r.predicted - r.current}%</div>
                <div className="roi-label">{r.name} growth</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Performance */}
        <div className="chart-card">
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
                  <linearGradient id="catBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgROI" name="Avg ROI %" fill="url(#catBarGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="charts-grid">
        {/* Platform Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Platform Distribution</div>
              <div className="chart-card-subtitle">Influencers across platforms</div>
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
            {platformData.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                <span style={{ color: 'var(--gray-400)' }}>{p.name}</span>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement vs ROI Scatter */}
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
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
