import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
} from 'recharts';
import { BrainCircuit, Zap, CheckCircle2, AlertTriangle, TrendingUp, DollarSign, BarChart3, Activity } from 'lucide-react';
import { predictCampaign, checkHealth, trainModels } from '../../services/api';

const CampaignCreate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    campaignName: '',
    budget: '',
    category: 'Lifestyle',
    platform: 'Instagram',
    campaignGoal: 'Sales Conversion',
    targetAudience: '',
    startDate: '',
    endDate: '',
    followers: '',
    likes: '',
    comments: '',
    engagementRate: '',
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(null); // null = checking, true = ready, false = not ready
  const [training, setTraining] = useState(false);

  // Check backend health on mount, auto-train if needed
  useEffect(() => {
    const init = async () => {
      try {
        const health = await checkHealth();
        if (health.trained) {
          setBackendReady(true);
        } else {
          setTraining(true);
          setBackendReady(false);
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await predictCampaign(formData);
      setResult(response.data);
      setStep(2);
    } catch (err) {
      alert('Error generating prediction: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const successPct = result ? Math.round((result.success_probability || 0) * 100) : 0;

  return (
    <div>
      <h2 className="page-title">Create Campaign</h2>
      <p className="page-subtitle">Set up a new campaign and predict its success with ML</p>

      {/* Backend status banner */}
      {backendReady === false && !training && (
        <div className="glass-card" style={{ marginBottom: 20, padding: '14px 20px', borderLeft: '3px solid #f97316' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fb923c' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: 13 }}>
              ML backend is offline. Start the backend server: <code style={{ color: '#e2e8f0' }}>cd backend && uvicorn main:app --reload</code>
            </span>
          </div>
        </div>
      )}
      {training && (
        <div className="glass-card" style={{ marginBottom: 20, padding: '14px 20px', borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#818cf8' }}>
            <Activity size={18} className="animate-pulse" />
            <span style={{ fontSize: 13 }}>Training ML models... this may take 15-30 seconds on first load.</span>
          </div>
        </div>
      )}

      <div className="prediction-grid">
        {/* Form Panel */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BrainCircuit size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Campaign Details</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Fill in both campaign and target influencer data</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Campaign Section */}
            <div className="form-section-label">Campaign Info</div>
            <div className="form-group">
              <label className="form-label">Campaign Name</label>
              <input type="text" name="campaignName" className="form-input" placeholder="e.g. Summer Product Launch" onChange={handleChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Budget ($)</label>
                <input type="number" name="budget" className="form-input" placeholder="e.g. 10000" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category / Niche</label>
                <select name="category" className="form-select" onChange={handleChange} value={formData.category}>
                  <option>Lifestyle</option>
                  <option>Tech</option>
                  <option>Fashion</option>
                  <option>Gaming</option>
                  <option>Health</option>
                  <option>Food</option>
                  <option>Beauty</option>
                  <option>Fitness</option>
                  <option>Travel</option>
                  <option>Finance</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Platform</label>
                <select name="platform" className="form-select" onChange={handleChange} value={formData.platform}>
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                  <option>Twitter/X</option>
                  <option>Facebook</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Campaign Goal</label>
                <select name="campaignGoal" className="form-select" onChange={handleChange} value={formData.campaignGoal}>
                  <option value="Sales Conversion">Sales Conversion</option>
                  <option value="Brand Awareness">Brand Awareness</option>
                  <option value="Lead Generation">Lead Generation</option>
                  <option value="Product Launch">Product Launch</option>
                  <option value="Community Building">Community Building</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" name="startDate" className="form-input" onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" name="endDate" className="form-input" onChange={handleChange} />
              </div>
            </div>

            {/* ML Inputs Section */}
            <div className="form-section-label" style={{ marginTop: 8 }}>Target Influencer Metrics (for ML Prediction)</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Followers</label>
                <input type="number" name="followers" className="form-input" placeholder="e.g. 50000" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Avg Likes</label>
                <input type="number" name="likes" className="form-input" placeholder="e.g. 3200" onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Avg Comments</label>
                <input type="number" name="comments" className="form-input" placeholder="e.g. 250" onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Engagement Rate (%)</label>
                <input type="number" step="0.1" name="engagementRate" className="form-input" placeholder="e.g. 5.2" onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !backendReady}>
              <Zap size={16} />
              {loading ? 'Analyzing with ML...' : training ? 'Training Models...' : 'Create & Predict'}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="glass-card">
          {result ? (
            <div className="result-card animate-fade-in">
              {/* Success Gauge */}
              <div style={{ width: 200, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={[{
                      name: 'Score',
                      value: successPct,
                      fill: successPct > 70 ? '#22c55e' : successPct > 45 ? '#eab308' : '#ef4444',
                    }]}
                    startAngle={225}
                    endAngle={-45}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      background={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ position: 'relative', marginTop: -130, textAlign: 'center', marginBottom: 60 }}>
                <div className="result-score" style={{
                  color: successPct > 70 ? '#22c55e' : successPct > 45 ? '#eab308' : '#ef4444',
                }}>
                  {successPct}%
                </div>
                <div className="result-label">Campaign Success Probability</div>
              </div>

              {/* ML Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                <div className="roi-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <TrendingUp size={14} style={{ color: 'var(--primary-400)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engagement Rate</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: 'var(--primary-400)' }}>
                    {result.pred_engagement_rate?.toFixed(2)}%
                  </div>
                </div>
                <div className="roi-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <BarChart3 size={14} style={{ color: 'var(--accent-400)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conversion Rate</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: 'var(--accent-400)' }}>
                    {result.pred_conversion_rate?.toFixed(2)}%
                  </div>
                </div>
                <div className="roi-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <DollarSign size={14} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pred. Revenue</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: '#22c55e' }}>
                    ${result.pred_revenue_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="roi-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Activity size={14} style={{ color: result.pred_roi_post_hoc >= 0 ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pred. ROI</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: result.pred_roi_post_hoc >= 0 ? '#22c55e' : '#ef4444' }}>
                    {result.pred_roi_post_hoc >= 0 ? '+' : ''}{(result.pred_roi_post_hoc * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Budget info */}
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-500)', marginBottom: 16 }}>
                Budget estimate used: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>${result.budget_used_usd?.toLocaleString()}</span>
              </div>

              {/* Recommendation */}
              <div className={`result-recommendation ${successPct > 70 ? 'recommendation-good' : 'recommendation-caution'}`}>
                {successPct > 70 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {successPct > 70
                  ? 'Highly Recommended — strong ML signals for campaign success'
                  : successPct > 45
                    ? 'Proceed with Caution — moderate success indicators detected'
                    : 'High Risk — consider adjusting campaign parameters or influencer selection'}
              </div>

              <button
                className="btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => navigate('/brand/recommendations')}
              >
                View Recommended Influencers
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <BrainCircuit size={48} />
              <p style={{ marginTop: 8 }}>Fill in campaign details to see ML prediction.</p>
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                Our 3-stage ML pipeline predicts engagement, conversion, revenue, and success probability.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignCreate;
