import React from 'react';
import { BrainCircuit, BarChart3, TrendingUp, Database, Sparkles } from 'lucide-react';

const About = () => {
  return (
    <div className="about-section">
      <div className="about-header">
        <div style={{
          width: 64, height: 64,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Sparkles size={32} color="white" />
        </div>
        <h2 className="page-title" style={{ textAlign: 'center' }}>About InfluencerAI</h2>
        <p className="page-subtitle" style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          A predictive influencer marketing system combining machine learning, automation, and data visualization.
        </p>
      </div>

      <div className="about-block glass-card" style={{ marginBottom: 24 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrainCircuit size={20} style={{ color: 'var(--primary-400)' }} />
          Project Overview
        </h3>
        <p>
          InfluencerAI is a final year project that addresses the lack of data-driven decision-making
          in influencer marketing. Many brands select influencers based on surface-level metrics like
          follower count, ignoring deeper engagement patterns. This system uses machine learning to
          predict campaign success probabilities and ROI values, empowering marketing teams to make
          informed, evidence-based decisions.
        </p>
      </div>

      <div className="about-block glass-card" style={{ marginBottom: 24 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={20} style={{ color: 'var(--accent-400)' }} />
          Key Features
        </h3>
        <ul>
          <li>Interactive dashboard with real-time influencer rankings and engagement analytics</li>
          <li>ML-powered campaign success predictor with confidence scoring</li>
          <li>Multi-metric analysis including radar charts and scatter plots</li>
          <li>ROI predictions comparing current performance with forecasted growth</li>
          <li>Category and platform distribution breakdowns</li>
          <li>Search, filter, and sort capabilities for influencer comparison</li>
        </ul>
      </div>

      <div className="about-block glass-card" style={{ marginBottom: 24 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={20} style={{ color: 'var(--success-400)' }} />
          Technology Stack
        </h3>
        <ul>
          <li>React 19 with Vite for fast development and HMR</li>
          <li>Recharts for data visualization (charts, gauges, scatter plots)</li>
          <li>React Router for client-side navigation</li>
          <li>Lucide React for consistent iconography</li>
          <li>CSS custom properties with glassmorphism design system</li>
          <li>Mock API layer simulating ML model predictions</li>
        </ul>
      </div>

      <div className="about-block glass-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={20} style={{ color: 'var(--warning-400)' }} />
          How It Works
        </h3>
        <ul>
          <li>Marketing teams input influencer metrics (followers, engagement, likes, category)</li>
          <li>The ML model analyzes engagement patterns and historical performance data</li>
          <li>A success probability score and ROI forecast are generated</li>
          <li>The interactive dashboard visualizes rankings, trends, and comparisons</li>
          <li>Teams use these insights to allocate budgets and select optimal influencers</li>
        </ul>
      </div>
    </div>
  );
};

export default About;
