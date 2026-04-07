import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { Search, Filter, ArrowUpRight } from 'lucide-react';
import { influencers, categoryPerformance } from '../data/dummyData';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
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

const getCategoryClass = (cat) => `category-${cat.toLowerCase()}`;
const getScoreClass = (score) => {
  if (score >= 85) return 'score-high';
  if (score >= 70) return 'score-medium';
  return 'score-low';
};

const Analysis = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('successScore');

  const filtered = useMemo(() => {
    let result = [...influencers];
    if (searchTerm) {
      result = result.filter(
        (inf) =>
          inf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inf.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    result.sort((a, b) => b[sortBy] - a[sortBy]);
    return result;
  }, [searchTerm, sortBy]);

  /* Radar data for the first filtered influencer */
  const radarData = filtered.length > 0
    ? [
        { metric: 'Engagement', value: filtered[0].engagement * 12 },
        { metric: 'Followers', value: Math.min(100, (filtered[0].followers / 210000) * 100) },
        { metric: 'Likes', value: Math.min(100, (filtered[0].likes / 7000) * 100) },
        { metric: 'Comments', value: Math.min(100, (filtered[0].comments / 500) * 100) },
        { metric: 'ROI', value: Math.min(100, (filtered[0].predictedROI / 210) * 100) },
        { metric: 'Score', value: filtered[0].successScore },
      ]
    : [];

  /* Scatter data */
  const scatterData = influencers.map((inf) => ({
    name: inf.name,
    engagement: inf.engagement,
    roi: inf.predictedROI,
    followers: inf.followers,
    color: inf.color,
  }));

  return (
    <div>
      <h2 className="page-title">Influencer Analysis</h2>
      <p className="page-subtitle">Deep-dive comparisons and performance breakdowns</p>

      {/* Search & Sort */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={18} />
          <input
            placeholder="Search influencers by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: 'var(--gray-500)' }} />
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto', minWidth: 160 }}
          >
            <option value="successScore">Sort by Score</option>
            <option value="engagement">Sort by Engagement</option>
            <option value="followers">Sort by Followers</option>
            <option value="predictedROI">Sort by ROI</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="rankings-table-wrapper">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Influencer</th>
                <th>Category</th>
                <th>Followers</th>
                <th>Engagement</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Predicted ROI</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inf, idx) => (
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
                        <div className="engagement-bar-fill" style={{
                          width: `${(inf.engagement / 10) * 100}%`,
                          background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {inf.engagement}%
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--gray-300)' }}>{inf.likes.toLocaleString()}</td>
                  <td style={{ color: 'var(--gray-300)' }}>{inf.comments.toLocaleString()}</td>
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

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Radar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">
                {filtered.length > 0 ? `${filtered[0].name} — Profile Radar` : 'Select an Influencer'}
              </div>
              <div className="chart-card-subtitle">Multi-metric breakdown</div>
            </div>
          </div>
          <div style={{ height: 300 }}>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
                  <PolarRadiusAxis stroke="#374151" fontSize={10} />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>No influencer data</p>
              </div>
            )}
          </div>
        </div>

        {/* Scatter Chart: Engagement vs ROI */}
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
                <XAxis
                  type="number"
                  dataKey="engagement"
                  name="Engagement"
                  unit="%"
                  stroke="#4b5563"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="roi"
                  name="ROI"
                  unit="%"
                  stroke="#4b5563"
                  fontSize={12}
                  tickLine={false}
                />
                <ZAxis type="number" dataKey="followers" range={[60, 400]} />
                <Tooltip content={<CustomTooltip />} />
                <Scatter data={scatterData} name="Influencers">
                  {scatterData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
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

export default Analysis;