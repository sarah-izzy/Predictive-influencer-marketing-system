import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Zap, CheckCircle2, AlertTriangle, TrendingUp, DollarSign, BarChart3, Activity } from 'lucide-react';
import { createCampaign, predictCampaign, checkHealth, trainModels } from '../../services/api';

const CampaignCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    campaignName: '',
    budget: '',
    brandCategory: 'Beauty',
    platform: 'Instagram',
    campaignGoal: 'Sales Conversion',
    targetAudienceAge: '25-34',
    paymentModel: 'Flat Fee',
    primaryAudienceGeo: 'Nigeria',
    startDate: '',
    endDate: '',
    campaignDuration: '30',
    targetMinFollowers: '1000',
    targetMaxFollowers: '5000000',
    niche: 'Beauty',
    followers: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    reach: '',
    accountAgeYears: '3',
    isVerified: '0',
    postsPerWeek: '4',
    fakeFollowerPct: '8',
    authenticityScore: '80',
    brandAlignment: '0.7',
    ageMatchScore: '0.5',
    geoMatch: '1',
    sentimentScore: '0.65',
    femalePct: '50',
    audience18_24: '35',
    audience25_34: '30',
    audience35plus: '35',
    audienceConcentrationScore: '0.65',
    reachQualityScore: '0.3',
    contentConsistencyScore: '50',
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendReady, setBackendReady] = useState(null); // null = checking, true = ready, false = not ready
  const [training, setTraining] = useState(false);
  const [analysisAlert, setAnalysisAlert] = useState(null);

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
    const minFollowers = Number(formData.targetMinFollowers || 0);
    const maxFollowers = Number(formData.targetMaxFollowers || 0);
    if (maxFollowers < minFollowers) {
      setAnalysisAlert({
        type: 'error',
        message: 'Maximum followers must be greater than or equal to minimum followers.',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await predictCampaign(formData);
      const created = await createCampaign({
        name: formData.campaignName,
        payload: formData,
        prediction_result: response.data,
      });
      if (created?.campaign?.id) {
        localStorage.setItem('influencerAI_activeCampaignId', created.campaign.id);
      }
      setResult(response.data);
      setAnalysisAlert({
        type: 'success',
        score: Math.round((response.data.success_probability || 0) * 100),
        campaignName: formData.campaignName || 'Campaign',
      });
    } catch (err) {
      setAnalysisAlert({
        type: 'error',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const successPct = result ? Math.round((result.success_probability || 0) * 100) : 0;
  const successClassifierModel = result?.success_classifier_model || 'success_cls_v4.pkl';
  const resultStatus = successPct > 70
    ? 'Highly Recommended'
    : successPct > 45
      ? 'Proceed with Caution'
      : 'High Risk';
  const resultMessage = successPct > 70
    ? 'Strong ML signals for campaign success'
    : successPct > 45
      ? 'Moderate success indicators detected'
      : 'Adjust campaign parameters or influencer selection';

  return (
    <div>
      {analysisAlert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={analysisAlert.type === 'error' ? 'Analysis failed' : 'Analysis ready'}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              width: 'min(420px, 100%)',
              textAlign: 'center',
              padding: '32px 28px 28px',
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                margin: '0 auto 18px',
                borderRadius: '50%',
                background: analysisAlert.type === 'error' ? 'rgba(220, 38, 38, 0.1)' : 'var(--primary-50)',
                border: analysisAlert.type === 'error' ? '2px solid #dc2626' : '2px solid var(--primary-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {analysisAlert.type === 'error' ? (
                <AlertTriangle size={38} color="#dc2626" />
              ) : (
                <CheckCircle2 size={40} color="var(--primary-600)" />
              )}
            </div>
            <h3 style={{ fontSize: 26, marginBottom: 8, color: 'var(--gray-900)' }}>
              {analysisAlert.type === 'error' ? 'Analysis failed' : 'Analysis is ready'}
            </h3>
            <p style={{ color: 'var(--gray-600)', fontSize: 15, lineHeight: 1.6, marginBottom: 22 }}>
              {analysisAlert.type === 'error'
                ? `The campaign analysis could not be generated: ${analysisAlert.message}`
                : `${analysisAlert.campaignName} has been analyzed with the ML pipeline. Success probability is ${analysisAlert.score}%.`}
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setAnalysisAlert(null)}
            >
              {analysisAlert.type === 'error' ? 'Close' : 'View Results'}
            </button>
          </div>
        </div>
      )}

      <h2 className="page-title">Create Campaign</h2>
      <p className="page-subtitle">Set up a new campaign and predict its success with ML</p>

      {/* Backend status banner */}
      {backendReady === false && !training && (
        <div className="glass-card" style={{ marginBottom: 20, padding: '14px 20px', borderLeft: '3px solid #F97316' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-900)' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: 13 }}>
              ML backend is offline. Start the backend server: <code style={{ color: 'var(--gray-900)' }}>cd backend && uvicorn main:app --reload</code>
            </span>
          </div>
        </div>
      )}
      {training && (
        <div className="glass-card" style={{ marginBottom: 20, padding: '14px 20px', borderLeft: '3px solid #F97316' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-900)' }}>
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
              background: 'var(--primary-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BrainCircuit size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)' }}>Campaign Details</div>
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
                <label className="form-label">Brand Category</label>
                <select name="brandCategory" className="form-select" onChange={handleChange} value={formData.brandCategory}>
                  <option>Tech</option>
                  <option>Fashion</option>
                  <option>Gaming</option>
                  <option>Health</option>
                  <option>Food</option>
                  <option>Beauty</option>
                  <option>Travel</option>
                  <option>Finance</option>
                  <option>Fitness</option>
                  <option>Lifestyle</option>
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
                <label className="form-label">Target Audience Age</label>
                <select name="targetAudienceAge" className="form-select" onChange={handleChange} value={formData.targetAudienceAge}>
                  <option>18-24</option>
                  <option>25-34</option>
                  <option>35-44</option>
                  <option>45+</option>
                  <option>All Ages</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Model</label>
                <select name="paymentModel" className="form-select" onChange={handleChange} value={formData.paymentModel}>
                  <option>Flat Fee</option>
                  <option>CPE</option>
                  <option>CPA</option>
                  <option>Revenue Share</option>
                  <option>Gifting</option>
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" name="startDate" className="form-input" onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" name="endDate" className="form-input" onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration Days</label>
                <input type="number" name="campaignDuration" className="form-input" min="1" max="365" onChange={handleChange} value={formData.campaignDuration} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Minimum Followers for Recommendations</label>
                <input
                  type="number"
                  name="targetMinFollowers"
                  className="form-input"
                  min="0"
                  step="1000"
                  onChange={handleChange}
                  value={formData.targetMinFollowers}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Maximum Followers for Recommendations</label>
                <input
                  type="number"
                  name="targetMaxFollowers"
                  className="form-input"
                  min="0"
                  step="1000"
                  onChange={handleChange}
                  value={formData.targetMaxFollowers}
                  required
                />
              </div>
            </div>

            {/* ML Inputs Section */}
            <div className="form-section-label" style={{ marginTop: 8 }}>Target Influencer Metrics (for ML Prediction)</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Influencer Niche</label>
                <select name="niche" className="form-select" onChange={handleChange} value={formData.niche}>
                  <option>Beauty</option>
                  <option>Fitness</option>
                  <option>Tech</option>
                  <option>Fashion</option>
                  <option>Food</option>
                  <option>Travel</option>
                  <option>Gaming</option>
                  <option>Lifestyle</option>
                  <option>Finance</option>
                  <option>Health</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Primary Audience Geo</label>
                <input type="text" name="primaryAudienceGeo" className="form-input" placeholder="Nigeria" onChange={handleChange} value={formData.primaryAudienceGeo} required />
              </div>
            </div>
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
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Avg Comments</label>
                <input type="number" name="comments" className="form-input" placeholder="e.g. 250" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Avg Shares</label>
                <input type="number" name="shares" className="form-input" placeholder="e.g. 80" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Avg Saves</label>
                <input type="number" name="saves" className="form-input" placeholder="e.g. 140" onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Avg Reach</label>
                <input type="number" name="reach" className="form-input" placeholder="e.g. 26000" onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Account Age Years</label>
                <input type="number" step="0.1" name="accountAgeYears" className="form-input" min="0" onChange={handleChange} value={formData.accountAgeYears} required />
              </div>
              <div className="form-group">
                <label className="form-label">Verified</label>
                <select name="isVerified" className="form-select" onChange={handleChange} value={formData.isVerified}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Posts Per Week</label>
                <input type="number" step="0.1" name="postsPerWeek" className="form-input" min="0" onChange={handleChange} value={formData.postsPerWeek} required />
              </div>
              <div className="form-group">
                <label className="form-label">Fake Followers (%)</label>
                <input type="number" step="0.1" name="fakeFollowerPct" className="form-input" min="0" max="100" onChange={handleChange} value={formData.fakeFollowerPct} required />
              </div>
              <div className="form-group">
                <label className="form-label">Authenticity Score</label>
                <input type="number" step="0.1" name="authenticityScore" className="form-input" min="0" max="100" onChange={handleChange} value={formData.authenticityScore} required />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Brand Alignment</label>
                <input type="number" step="0.01" name="brandAlignment" className="form-input" min="0" max="1" onChange={handleChange} value={formData.brandAlignment} required />
              </div>
              <div className="form-group">
                <label className="form-label">Audience Age Match</label>
                <input type="number" step="0.01" name="ageMatchScore" className="form-input" min="0" max="1" onChange={handleChange} value={formData.ageMatchScore} required />
              </div>
              <div className="form-group">
                <label className="form-label">Audience Geo Match</label>
                <select name="geoMatch" className="form-select" onChange={handleChange} value={formData.geoMatch}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Sentiment Score</label>
                <input type="number" step="0.01" name="sentimentScore" className="form-input" min="0" max="1" onChange={handleChange} value={formData.sentimentScore} required />
              </div>
              <div className="form-group">
                <label className="form-label">Reach Quality Score</label>
                <input type="number" step="0.01" name="reachQualityScore" className="form-input" min="0" max="1" onChange={handleChange} value={formData.reachQualityScore} required />
              </div>
              <div className="form-group">
                <label className="form-label">Content Consistency</label>
                <input type="number" step="0.1" name="contentConsistencyScore" className="form-input" min="0" max="100" onChange={handleChange} value={formData.contentConsistencyScore} required />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Female Audience (%)</label>
                <input type="number" step="0.1" name="femalePct" className="form-input" min="0" max="100" onChange={handleChange} value={formData.femalePct} required />
              </div>
              <div className="form-group">
                <label className="form-label">Audience 18-24 (%)</label>
                <input type="number" step="0.1" name="audience18_24" className="form-input" min="0" max="100" onChange={handleChange} value={formData.audience18_24} required />
              </div>
              <div className="form-group">
                <label className="form-label">Audience 25-34 (%)</label>
                <input type="number" step="0.1" name="audience25_34" className="form-input" min="0" max="100" onChange={handleChange} value={formData.audience25_34} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Audience 35+ (%)</label>
                <input type="number" step="0.1" name="audience35plus" className="form-input" min="0" max="100" onChange={handleChange} value={formData.audience35plus} required />
              </div>
              <div className="form-group">
                <label className="form-label">Audience Concentration</label>
                <input type="number" step="0.01" name="audienceConcentrationScore" className="form-input" min="0" max="1" onChange={handleChange} value={formData.audienceConcentrationScore} required />
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
              <div style={{ width: '100%', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--gray-600)', fontWeight: 700 }}>
                      Campaign Success Probability
                    </div>
                    <div style={{ fontSize: 15, color: 'var(--gray-700)', marginTop: 6 }}>{resultMessage}</div>
                  </div>
                  <div style={{ fontSize: 48, lineHeight: 1, fontWeight: 800, color: 'var(--primary-700)' }}>
                    {successPct}%
                  </div>
                </div>
                <div style={{ height: 10, background: '#ffffff', border: '1px solid var(--primary-200)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${successPct}%`, height: '100%', background: 'var(--primary-600)', borderRadius: 999 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--gray-600)' }}>
                  <span>{resultStatus}</span>
                  <span>Classifier: <strong style={{ color: 'var(--gray-900)' }}>{successClassifierModel}</strong></span>
                </div>
              </div>

              {/* ML Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, width: '100%', marginBottom: 18 }}>
                <div className="roi-card" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <TrendingUp size={14} style={{ color: 'var(--primary-400)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engagement Rate</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: 'var(--primary-400)' }}>
                    {(result.pred_engagement_rate || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="roi-card" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <BarChart3 size={14} style={{ color: 'var(--accent-400)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conversion Rate</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: 'var(--accent-400)' }}>
                    {(result.pred_conversion_rate || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="roi-card" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <DollarSign size={14} style={{ color: 'var(--gray-900)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pred. Revenue</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: 'var(--gray-900)' }}>
                    ${result.pred_revenue_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="roi-card" style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Activity size={14} style={{ color: 'var(--gray-900)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pred. ROI</span>
                  </div>
                  <div className="roi-value" style={{ fontSize: 22, color: 'var(--gray-900)' }}>
                    {result.pred_roi_post_hoc >= 0 ? '+' : ''}{(result.pred_roi_post_hoc * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Budget info */}
              <div style={{ width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--gray-600)', marginBottom: 14, padding: '10px 12px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)' }}>
                Budget estimate used: <span style={{ color: 'var(--gray-900)', fontWeight: 600 }}>${result.budget_used_usd?.toLocaleString()}</span>
              </div>

              {/* Recommendation */}
              <div className={`result-recommendation ${successPct > 70 ? 'recommendation-good' : 'recommendation-caution'}`}>
                {successPct > 70 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {resultStatus} - {resultMessage}
              </div>

              <button
                className="btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => navigate('/brand/recommendations')}
              >
                Select Recommended Influencers
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
