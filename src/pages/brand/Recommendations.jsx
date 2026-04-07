import { useState, useEffect, useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from 'recharts';
import { Search, Filter, ArrowUpRight, Star, Users, TrendingUp, Sparkles, Activity, AlertTriangle } from 'lucide-react';
import { getRecommendedInfluencers, checkHealth, trainModels } from '../../services/api';

const getScoreClass = (score) => {
  if (score >= 85) return 'score-high';
  if (score >= 70) return 'score-medium';
  return 'score-low';
};

const Recommendations = () => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [filters, setFilters] = useState({
    category: 'All',
    platform: 'All',
    minEngagement: '',
    search: '',
    campaignGoal: 'Sales Conversion',
  });
  const [sortBy, setSortBy] = useState('mlScore');
  const [backendReady, setBackendReady] = useState(null);
  const [training, setTraining] = useState(false);

  // Check backend health and auto-train on mount
  useEffect(() => {
    const init = async () => {
      try {
        const health = await checkHealth();
        if (health.trained) {
          setBackendReady(true);
        } else {
          setTraining(true);
          await trainModels(800);
          setBackendReady(true);
          setTraining(false);
        }
      } catch {
        setBackendReady(false);
        setTraining(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (backendReady) {
      fetchInfluencers();
    }
  }, [backendReady, filters.category, filters.platform, filters.minEngagement, filters.campaignGoal]);

  const fetchInfluencers = async () => {
    setLoading(true);
    const result = await getRecommendedInfluencers({
      category: filters.category,
      platform: filters.platform,
      minFollowers: filters.minEngagement ? parseFloat(filters.minEngagement) * 10000 : undefined,
      campaignGoal: filters.campaignGoal,
    });
    setInfluencers(result);
    if (result.length > 0 && !selectedInfluencer) {
      setSelectedInfluencer(result[0]);
    }
    setLoading(false);
  };

  const displayed = useMemo(() => {
    let results = [...influencers];
    if (filters.search) {
      results = results.filter(i =>
        i.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    results.sort((a, b) => b[sortBy] - a[sortBy]);
    return results;
  }, [influencers, filters.search, sortBy]);

  const radarData = selectedInfluencer
    ? [
        { metric: 'Engagement', value: Math.min(100, (selectedInfluencer.pred_er || selectedInfluencer.engagement) * 12) },
        { metric: 'Followers', value: Math.min(100, (selectedInfluencer.followers / 210000) * 100) },
        { metric: 'Conversion', value: Math.min(100, (selectedInfluencer.pred_cvr || 3) * 15) },
        { metric: 'ML Score', value: Math.min(100, selectedInfluencer.mlScore) },
        { metric: 'Success', value: Math.min(100, (selectedInfluencer.pred_success || 0.7) * 100) },
        { metric: 'Score', value: selectedInfluencer.successScore },
      ]
    : [];

  return (
    <div>
      <h2 className="page-title">Influencer Recommendations</h2>
      <p className="page-subtitle">ML-ranked influencers optimized for your campaign goals</p>

      {/* Backend status */}
      {backendReady === false && !training && (
        <div className="glass-card" style={{ marginBottom: 16, padding: '12px 20px', borderLeft: '3px solid #f97316' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fb923c', fontSize: 13 }}>
            <AlertTriangle size={16} />
            ML backend offline — showing local fallback data. Start backend: <code style={{ color: '#e2e8f0' }}>cd backend && uvicorn main:app --reload</code>
          </div>
        </div>
      )}
      {training && (
        <div className="glass-card" style={{ marginBottom: 16, padding: '12px 20px', borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#818cf8', fontSize: 13 }}>
            <Activity size={16} className="animate-pulse" />
            Training ML models... recommendations will appear shortly.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rec-filters">
        <div className="search-bar" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <Search size={18} />
          <input
            placeholder="Search influencers..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="All">All Categories</option>
          <option>Tech</option>
          <option>Health</option>
          <option>Gaming</option>
          <option>Lifestyle</option>
          <option>Food</option>
          <option>Fashion</option>
        </select>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
        >
          <option value="All">All Platforms</option>
          <option>Instagram</option>
          <option>TikTok</option>
          <option>YouTube</option>
          <option>Twitter/X</option>
        </select>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 160 }}
          value={filters.campaignGoal}
          onChange={(e) => setFilters({ ...filters, campaignGoal: e.target.value })}
        >
          <option value="Sales Conversion">Sales Conversion</option>
          <option value="Brand Awareness">Brand Awareness</option>
          <option value="Lead Generation">Lead Generation</option>
          <option value="Product Launch">Product Launch</option>
          <option value="Community Building">Community Building</option>
        </select>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="mlScore">Sort by ML Score</option>
          <option value="successScore">Sort by Success Score</option>
          <option value="engagement">Sort by Engagement</option>
          <option value="predictedROI">Sort by ROI</option>
          <option value="followers">Sort by Followers</option>
        </select>
      </div>

      <div className="rec-layout">
        {/* Influencer Cards List */}
        <div className="rec-list">
          {loading ? (
            <div className="empty-state" style={{ minHeight: 200 }}>
              <Sparkles size={32} />
              <p>Running ML ranking algorithm...</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 200 }}>
              <Users size={32} />
              <p>No influencers match your filters</p>
            </div>
          ) : (
            displayed.map((inf, idx) => (
              <div
                key={inf.id}
                className={`rec-card ${selectedInfluencer?.id === inf.id ? 'rec-card-selected' : ''}`}
                onClick={() => setSelectedInfluencer(inf)}
              >
                <div className="rec-card-rank">
                  <span className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-default'}`}>
                    {idx + 1}
                  </span>
                </div>
                <div className="rec-card-avatar" style={{ background: inf.color }}>
                  {inf.name.charAt(0)}
                </div>
                <div className="rec-card-info">
                  <div className="rec-card-name">{inf.name}</div>
                  <div className="rec-card-meta">
                    {inf.category} · {inf.platform} · {(inf.followers / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="rec-card-scores">
                  <div className="rec-card-ml-score">
                    <Star size={14} />
                    <span>{inf.mlScore}</span>
                  </div>
                  <div className="rec-card-roi">
                    <ArrowUpRight size={12} style={{ color: 'var(--success-400)' }} />
                    <span>{inf.predictedROI}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="rec-detail">
          {selectedInfluencer ? (
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div className="rec-detail-avatar" style={{ background: selectedInfluencer.color }}>
                  {selectedInfluencer.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{selectedInfluencer.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                    {selectedInfluencer.category} · {selectedInfluencer.platform}
                  </div>
                </div>
                <span className={`score-badge ${getScoreClass(selectedInfluencer.successScore)}`} style={{ marginLeft: 'auto' }}>
                  Score: {selectedInfluencer.successScore}
                </span>
              </div>

              {/* Stats */}
              <div className="rec-detail-stats">
                <div className="rec-detail-stat">
                  <Users size={16} style={{ color: 'var(--primary-400)' }} />
                  <div>
                    <div className="rec-detail-stat-val">{(selectedInfluencer.followers / 1000).toFixed(0)}K</div>
                    <div className="rec-detail-stat-label">Followers</div>
                  </div>
                </div>
                <div className="rec-detail-stat">
                  <TrendingUp size={16} style={{ color: 'var(--success-400)' }} />
                  <div>
                    <div className="rec-detail-stat-val">
                      {selectedInfluencer.pred_er ? selectedInfluencer.pred_er.toFixed(2) : selectedInfluencer.engagement}%
                    </div>
                    <div className="rec-detail-stat-label">Pred. ER</div>
                  </div>
                </div>
                <div className="rec-detail-stat">
                  <ArrowUpRight size={16} style={{ color: 'var(--accent-400)' }} />
                  <div>
                    <div className="rec-detail-stat-val">
                      {selectedInfluencer.pred_success ? `${(selectedInfluencer.pred_success * 100).toFixed(0)}%` : `${selectedInfluencer.predictedROI}%`}
                    </div>
                    <div className="rec-detail-stat-label">Success Prob.</div>
                  </div>
                </div>
                <div className="rec-detail-stat">
                  <Star size={16} style={{ color: '#fbbf24' }} />
                  <div>
                    <div className="rec-detail-stat-val">{selectedInfluencer.mlScore}</div>
                    <div className="rec-detail-stat-label">ML Score</div>
                  </div>
                </div>
              </div>

              {/* Radar */}
              <div style={{ height: 260, marginTop: 16 }}>
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
              </div>

              <div className="rec-detail-rate">
                Estimated Rate: <span>${selectedInfluencer.rate?.toLocaleString() || 'N/A'}</span> per campaign
              </div>
            </div>
          ) : (
            <div className="glass-card empty-state" style={{ minHeight: 400 }}>
              <Users size={48} />
              <p>Select an influencer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
