import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Award, BarChart3, CheckCircle2, Target, TrendingUp, Users } from 'lucide-react';
import {
  getCampaignRecommendations,
  getCampaigns,
} from '../../services/api';

const markerLabels = {
  engagementRate: 'engagement',
  audienceAuthenticity: 'authentic audience',
  brandAlignment: 'brand fit',
  conversionRate: 'conversion',
  predictedRoi: 'ROI',
  audienceDemographicsMatch: 'audience match',
  sentimentScore: 'sentiment',
  historicalCampaignPerformance: 'past performance',
  reachQuality: 'reach quality',
  postingConsistency: 'posting consistency',
};

const topReasons = (markers = {}) =>
  Object.entries(markers)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 3)
    .map(([key, value]) => `${markerLabels[key] || key}: ${Math.round(value)}%`);

const Recommendations = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const campaignData = await getCampaigns();
        setCampaigns(campaignData || []);
        const activeId = localStorage.getItem('influencerAI_activeCampaignId');
        setSelectedCampaignId(
          (campaignData || []).find((campaign) => campaign.id === activeId)?.id
          || campaignData?.[0]?.id
          || ''
        );
      } catch (err) {
        setError(err.message || 'Unable to load campaigns and influencers.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId]
  );

  useEffect(() => {
    const rank = async () => {
      if (!selectedCampaign) {
        setRecommendations([]);
        setSummary(null);
        return;
      }
      setRankingLoading(true);
      setError('');
      try {
        const result = await getCampaignRecommendations(selectedCampaign.id);
        setRecommendations((result.recommendations || []).map((rec, idx) => ({
          ...rec,
          rank: idx + 1,
          name: rec.influencer_id,
          followers: rec.followers_count,
          category: rec.niche,
          engagement: Number(rec.pred_er || 0),
          conversion: Number(rec.pred_cvr || 0),
          predictedROI: Number(rec.pred_roi || 0) * 100,
          successScore: Number(rec.pred_success || 0) * 100,
          mlScore: Number(rec.composite_score || 0) * 100,
          reason: rec.grading?.explanation || 'Picked for its campaign fit and predicted performance.',
        })));
        setSummary(result);
      } catch (err) {
        setRecommendations([]);
        setSummary(null);
        setError(err.message || 'Unable to rank influencers for this campaign.');
      } finally {
        setRankingLoading(false);
      }
    };
    rank();
  }, [selectedCampaign]);

  return (
    <div>
      <h2 className="page-title">Influencer Recommendations</h2>
      <p className="page-subtitle">Select a campaign to see ranked influencers and why each one was picked</p>

      {error && (
        <div className="glass-card" style={{ marginBottom: 16, padding: '12px 20px', borderLeft: '3px solid var(--danger-500)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-900)', fontSize: 13 }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        </div>
      )}

      <div className="glass-card rec-campaign-picker">
        <div className="chart-card-header" style={{ marginBottom: 0 }}>
          <div>
            <div className="chart-card-title">Campaign</div>
            <div className="chart-card-subtitle">Choose one campaign to rank registered influencers</div>
          </div>
          <Target size={18} color="var(--primary-600)" />
        </div>

        {loading ? (
          <div className="empty-state rec-picker-empty">
            <BarChart3 size={28} />
            <p>Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state rec-picker-empty">
            <Target size={28} />
            <p>Create a campaign first to generate recommendations.</p>
          </div>
        ) : (
          <>
            <div className="rec-select-wrap">
              <label className="form-label" htmlFor="campaign-select">Campaign</label>
              <select
                id="campaign-select"
                className="form-select"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
              >
                {campaigns.map((campaign) => {
                  const payload = campaign.payload || {};
                  const goal = payload.campaignGoal || payload.campaign_goal || 'Sales Conversion';
                  const category = payload.brandCategory || payload.category || campaign.category || 'Lifestyle';
                  return (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} - {goal} / {category}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedCampaign && (
              <div className="rec-campaign-summary">
                <div>
                  <span>Goal</span>
                  <strong>{selectedCampaign.payload?.campaignGoal || selectedCampaign.payload?.campaign_goal || 'Sales Conversion'}</strong>
                </div>
                <div>
                  <span>Category</span>
                  <strong>{selectedCampaign.payload?.brandCategory || selectedCampaign.payload?.category || selectedCampaign.category || 'Lifestyle'}</strong>
                </div>
                <div>
                  <span>Budget</span>
                  <strong>${Number(selectedCampaign.budget || selectedCampaign.payload?.budget || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedCampaign.status || 'draft'}</strong>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass-card rec-results-panel">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Top Influencers</div>
              <div className="chart-card-subtitle">
                {selectedCampaign ? `Highest to lowest for ${selectedCampaign.name}` : 'Select a campaign'}
              </div>
            </div>
            <Users size={18} color="var(--primary-600)" />
          </div>

          {summary && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <span className="score-badge score-medium">{summary.passed || 0} passed filters</span>
              <span className="score-badge score-medium">{summary.filtered || 0} evaluated</span>
              <span className="score-badge score-medium">{summary.campaign_goal}</span>
              <span className="score-badge score-medium">
                {Number(summary.follower_range?.min || 0).toLocaleString()} - {summary.follower_range?.max ? Number(summary.follower_range.max).toLocaleString() : 'No max'} followers
              </span>
            </div>
          )}

          {rankingLoading ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <TrendingUp size={32} />
              <p>Ranking influencers for this campaign...</p>
            </div>
          ) : !selectedCampaign ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <Target size={32} />
              <p>Select a campaign to view recommendations.</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <Users size={32} />
              <p>No influencers passed the recommendation filters.</p>
            </div>
          ) : (
            <div className="rec-ranked-list">
              {recommendations.map((rec) => {
                const reasons = topReasons(rec.grading?.markers);
                return (
                  <article key={`${rec.rank}-${rec.name}`} className={`rec-rank-card ${rec.rank === 1 ? 'rec-rank-card-featured' : ''}`}>
                    <div className="rec-rank-head">
                      <div className="rec-rank-title">
                        <span className="rank-badge rank-1">{rec.rank}</span>
                        <div className="rec-avatar-sm">{String(rec.name || 'I').charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="rec-rank-name">
                            {rec.name}
                            {rec.rank === 1 && <span className="rec-top-tag"><Award size={12} /> Best match</span>}
                          </div>
                          <div className="rec-rank-meta">
                            {rec.platform} / {rec.category} / {Number(rec.followers || 0).toLocaleString()} followers
                          </div>
                        </div>
                      </div>
                      <div className="rec-match-score">
                        <strong>
                          {Math.round(rec.mlScore)}%
                        </strong>
                        <span>match score</span>
                      </div>
                    </div>

                    <div className="rec-metric-grid">
                      <div>
                        <div className="rec-detail-stat-label">Engagement</div>
                        <strong>{rec.engagement.toFixed(2)}%</strong>
                      </div>
                      <div>
                        <div className="rec-detail-stat-label">Success</div>
                        <strong>{Math.round(rec.successScore)}%</strong>
                      </div>
                      <div>
                        <div className="rec-detail-stat-label">ROI</div>
                        <strong>{rec.predictedROI.toFixed(1)}%</strong>
                      </div>
                      <div>
                        <div className="rec-detail-stat-label">Conversion</div>
                        <strong>{rec.conversion.toFixed(2)}%</strong>
                      </div>
                    </div>

                    <div className="rec-why">
                      <CheckCircle2 size={16} />
                      <div>
                        <strong>Why picked:</strong> {rec.reason}
                        {reasons.length > 0 && (
                          <div className="rec-signals">
                            Top signals: {reasons.join(', ')}.
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
};

export default Recommendations;
