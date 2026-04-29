import React, { useState, useEffect } from 'react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
} from 'recharts';
import { BrainCircuit, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { predictCampaign, testBackendIntegration } from '../services/api';

const Prediction = () => {
  const [formData, setFormData] = useState({
    followers: '',
    likes: '',
    comments: '',
    engagementRate: '',
    postFrequency: '',
    category: 'Lifestyle',
    platform: 'Instagram',
    budget: '5000',
    campaignGoal: 'Sales Conversion',
    fakeFollowerPct: '8',
    authenticityScore: '80',
    brandAlignment: '0.7',
    ageMatchScore: '0.5',
    geoMatch: '1',
    sentimentScore: '0.65',
    paymentModel: 'Flat Fee',
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    const testBackend = async () => {
      const test = await testBackendIntegration();
      setBackendStatus(test.success ? 'connected' : 'error');
    };
    testBackend();
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
      // Map backend response to frontend format
      const mappedResult = {
        predictedSuccessScore: Math.round((response.data.pred_success || 0) * 100),
        predictedEngagementRate: (response.data.pred_er || 0) * 100,
        predictedConversionRate: (response.data.pred_cvr || 0) * 100,
        predictedRevenue: response.data.pred_revenue || 0,
        confidence: 0.85, // Default confidence for now
        // Backend raw values
        pred_er: response.data.pred_er,
        pred_cvr: response.data.pred_cvr,
        pred_success: response.data.pred_success,
        pred_revenue: response.data.pred_revenue,
      };
      setResult(mappedResult);
    } catch (error) {
      console.error('Prediction error:', error);
      alert(`Error fetching prediction: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* Radial data for the result gauge */
  const gaugeData = result
    ? [
        { name: 'Score', value: result.predictedSuccessScore, fill: result.predictedSuccessScore > 80 ? '#22c55e' : '#eab308' },
        { name: 'Remaining', value: 100 - result.predictedSuccessScore, fill: 'rgba(255,255,255,0.04)' },
      ]
    : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h2 className="page-title">Campaign Predictor</h2>
        <div style={{
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          fontSize: '12px',
          fontWeight: '500',
          background: backendStatus === 'connected' ? 'var(--success-50)' : 
                      backendStatus === 'error' ? 'var(--danger-50)' : 'var(--gray-100)',
          color: backendStatus === 'connected' ? 'var(--success-600)' : 
                  backendStatus === 'error' ? 'var(--danger-600)' : 'var(--gray-600)',
        }}>
          {backendStatus === 'connected' ? 'Backend Connected' : 
           backendStatus === 'error' ? 'Backend Error' : 'Checking Backend...'}
        </div>
      </div>
      <p className="page-subtitle">Enter influencer metrics to generate an ML-powered success forecast</p>

      <div className="prediction-grid">
        {/* Form */}
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
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Input Metrics</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Fill in the influencer data below</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Followers</label>
              <input
                type="number"
                name="followers"
                className="form-input"
                placeholder="e.g. 50000"
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Average Likes</label>
              <input
                type="number"
                name="likes"
                className="form-input"
                placeholder="e.g. 3200"
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Average Comments</label>
              <input
                type="number"
                name="comments"
                className="form-input"
                placeholder="e.g. 250"
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Engagement Rate (%)</label>
              <input
                type="number"
                step="0.1"
                name="engagementRate"
                className="form-input"
                placeholder="e.g. 5.2"
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className="form-select" onChange={handleChange}>
                <option>Lifestyle</option>
                <option>Tech</option>
                <option>Fashion</option>
                <option>Gaming</option>
                <option>Health</option>
                <option>Food</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Zap size={16} />
              {loading ? 'Analyzing...' : 'Predict Success'}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="glass-card">
          {result ? (
            <div className="result-card animate-fade-in">
              {/* Gauge */}
              <div style={{ width: 200, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={[gaugeData[0]]}
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
              <div style={{
                position: 'relative',
                marginTop: -130,
                textAlign: 'center',
                marginBottom: 60,
              }}>
                <div className="result-score" style={{
                  color: result.predictedSuccessScore > 80 ? '#22c55e' : '#eab308',
                }}>
                  {result.predictedSuccessScore}%
                </div>
                <div className="result-label">Success Probability</div>
              </div>

              {/* Confidence */}
              <div style={{
                display: 'flex',
                gap: 16,
                marginBottom: 20,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                <div className="roi-card" style={{ minWidth: 120 }}>
                  <div className="roi-value" style={{ fontSize: 20, color: 'var(--primary-400)' }}>
                    {Math.round(result.confidence * 100)}%
                  </div>
                  <div className="roi-label">Confidence</div>
                </div>
                <div className="roi-card" style={{ minWidth: 120 }}>
                  <div className="roi-value" style={{
                    fontSize: 20,
                    color: result.predictedSuccessScore > 80 ? 'var(--success-400)' : 'var(--warning-400)',
                  }}>
                    {result.predictedSuccessScore > 80 ? 'High' : 'Medium'}
                  </div>
                  <div className="roi-label">Rating</div>
                </div>
              </div>

              {/* Recommendation */}
              <div className={`result-recommendation ${result.predictedSuccessScore > 80 ? 'recommendation-good' : 'recommendation-caution'}`}>
                {result.predictedSuccessScore > 80
                  ? <CheckCircle2 size={18} />
                  : <AlertTriangle size={18} />
                }
                {result.recommendation}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <BrainCircuit size={48} />
              <p style={{ marginTop: 8 }}>Enter influencer metrics to see the ML prediction.</p>
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                Our model analyzes engagement patterns to forecast campaign success.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prediction;