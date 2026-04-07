import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BrainCircuit, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      desc: 'Monitor engagement metrics, follower growth, and campaign performance with interactive visualizations.',
      bg: 'linear-gradient(135deg, #6366f1, #818cf8)',
    },
    {
      icon: BrainCircuit,
      title: 'ML-Powered Predictions',
      desc: 'Our trained model forecasts campaign success probability and ROI before you invest a dollar.',
      bg: 'linear-gradient(135deg, #a855f7, #c084fc)',
    },
    {
      icon: TrendingUp,
      title: 'ROI Optimization',
      desc: 'Identify high-performance influencers and allocate budgets where they generate maximum returns.',
      bg: 'linear-gradient(135deg, #22c55e, #4ade80)',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            AI-Powered Influencer Marketing Platform
          </div>
          <h1 className="hero-title">
            Predict Campaign Success Before You Spend
          </h1>
          <p className="hero-description">
            Leverage machine learning to analyze influencer metrics, forecast engagement, and optimize your marketing ROI with evidence-based decisions.
          </p>
          <div className="hero-buttons">
            <Link to="/prediction" className="btn-hero-primary">
              <BrainCircuit size={18} />
              Start Prediction
              <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" className="btn-hero-secondary">
              <BarChart3 size={18} />
              View Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="features-grid">
        {features.map((f, i) => (
          <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.12}s` }}>
            <div className="feature-icon" style={{ background: f.bg }}>
              <f.icon size={24} />
            </div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;