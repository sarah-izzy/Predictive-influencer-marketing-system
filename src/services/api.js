const API_BASE = 'http://localhost:8000';

// ─── Helper ──────────────────────────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API request failed');
  }
  return res.json();
};

// ─── Backend health & training ───────────────────────────────────────────────

/** Check if backend is alive and models are trained */
export const checkHealth = () => apiFetch('/health');

/** Trigger model training (call once on first visit) */
export const trainModels = (nSamples = 1200) =>
  apiFetch('/train', {
    method: 'POST',
    body: JSON.stringify({ n_samples: nSamples, save_models: false }),
  });

// ─── Prediction API ─────────────────────────────────────────────────────────

/**
 * Map frontend campaign form fields → backend InfluencerInput schema,
 * then call POST /predict.
 */
export const predictCampaign = async (formData) => {
  // Derive budget bracket from raw budget number
  const rawBudget = parseFloat(formData.budget) || 5000;
  let budgetBracket = '$5K-$20K';
  if (rawBudget < 1000) budgetBracket = '<$1K';
  else if (rawBudget < 5000) budgetBracket = '$1K-$5K';
  else if (rawBudget < 20000) budgetBracket = '$5K-$20K';
  else if (rawBudget < 100000) budgetBracket = '$20K-$100K';
  else budgetBracket = '>$100K';

  // Derive influencer tier from follower count
  const followers = parseFloat(formData.followers) || 10000;
  let tier = 'Micro';
  if (followers < 10000) tier = 'Nano';
  else if (followers < 100000) tier = 'Micro';
  else if (followers < 500000) tier = 'Mid-Tier';
  else if (followers < 1000000) tier = 'Macro';
  else tier = 'Mega';

  // Map frontend category to backend niche
  const nicheMap = {
    Lifestyle: 'Lifestyle', Tech: 'Tech', Fashion: 'Fashion',
    Gaming: 'Gaming', Health: 'Health', Food: 'Food',
    Beauty: 'Beauty', Fitness: 'Fitness', Travel: 'Travel', Finance: 'Finance',
  };
  const niche = nicheMap[formData.category] || 'Lifestyle';

  // Map platform (frontend values match backend values)
  const platform = formData.platform || 'Instagram';

  // Map campaign goal
  const goalMap = {
    awareness: 'Brand Awareness',
    'Brand Awareness': 'Brand Awareness',
    sales: 'Sales Conversion',
    'Sales Conversion': 'Sales Conversion',
    leads: 'Lead Generation',
    'Lead Generation': 'Lead Generation',
    launch: 'Product Launch',
    'Product Launch': 'Product Launch',
    community: 'Community Building',
    'Community Building': 'Community Building',
  };
  const campaignGoal = goalMap[formData.campaignGoal] || goalMap[formData.campaign_goal] || 'Sales Conversion';

  const likes = parseFloat(formData.likes) || 0;
  const comments = parseFloat(formData.comments) || 0;

  const payload = {
    followers_count: followers,
    hist_avg_likes_per_post: likes,
    hist_avg_comments_per_post: comments,
    fake_follower_pct: parseFloat(formData.fakeFollowerPct) || 8.0,
    audience_authenticity_score: parseFloat(formData.authenticityScore) || 80.0,
    brand_alignment_score: parseFloat(formData.brandAlignment) || 0.7,
    audience_age_match_score: parseFloat(formData.ageMatchScore) || 0.5,
    audience_geo_match: formData.geoMatch !== undefined ? parseInt(formData.geoMatch) : 1,
    hist_sentiment_score: parseFloat(formData.sentimentScore) || 0.65,
    platform: platform,
    niche: niche,
    influencer_tier: tier,
    campaign_goal: campaignGoal,
    campaign_budget_bracket: budgetBracket,
    payment_model: formData.paymentModel || 'Flat Fee',
  };

  const data = await apiFetch('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return { success: true, data };
};

// ─── Recommendation API ──────────────────────────────────────────────────────

/**
 * Generate ML-ranked recommendations by creating a synthetic pool
 * and sending it to the backend /recommend endpoint for model-based ranking.
 */
export const getRecommendedInfluencers = async (filters = {}) => {
  // Generate a synthetic pool of 50 influencers with valid backend schema values
  const pool = [];
  const platforms = ["Instagram", "YouTube", "TikTok", "Twitter/X", "Facebook"];
  const niches = ["Beauty", "Fitness", "Tech", "Fashion", "Food", "Travel", "Gaming", "Lifestyle", "Finance", "Health"];
  const tiers = ["Nano", "Micro", "Mid-Tier", "Macro", "Mega"];
  const goals = ["Brand Awareness", "Lead Generation", "Product Launch", "Sales Conversion", "Community Building"];
  const budgets = ["<$1K", "$1K-$5K", "$5K-$20K", "$20K-$100K", ">$100K"];
  const paymentModels = ["Flat Fee", "CPE", "CPA", "Revenue Share", "Gifting"];
  const ages = ["18-24", "25-34", "35-44", "45+", "All Ages"];
  
  for (let i = 0; i < 50; i++) {
    const followers = Math.floor(Math.random() * 900000 + 1000); // 1K to 900K
    pool.push({
      influencer_id: `INF${String(i + 1).padStart(4, '0')}`,
      followers_count: followers,
      hist_avg_likes_per_post: Math.floor(followers * Math.random() * 0.08),
      hist_avg_comments_per_post: Math.floor(followers * Math.random() * 0.015),
      hist_avg_reach_per_post: Math.floor(followers * Math.random() * 0.35),
      fake_follower_pct: Math.random() * 50,
      audience_authenticity_score: Math.random() * 80 + 20,
      brand_alignment_score: Math.random(),
      audience_age_match_score: Math.random(),
      audience_geo_match: Math.random() > 0.35 ? 1 : 0,
      hist_sentiment_score: Math.random() * 0.9 + 0.1,
      engagement_per_follower: Math.random() * 0.1,
      interaction_velocity: Math.random() * 0.35 + 0.05,
      reach_quality_score: Math.random() * 0.8,
      content_consistency_score: Math.random() * 90 + 10,
      audience_concentration_score: Math.random() * 0.9 + 0.1,
      hist_posts_per_week: Math.random() * 13 + 1,
      hist_avg_shares_per_post: Math.floor(Math.random() * 100),
      hist_avg_saves_per_post: Math.floor(Math.random() * 200),
      account_age_years: Math.random() * 9 + 1,
      is_verified: Math.random() > 0.7 ? 1 : 0,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      niche: niches[Math.floor(Math.random() * niches.length)],
      influencer_tier: tiers[Math.floor(Math.random() * tiers.length)],
      primary_audience_geo: "Nigeria",
      brand_category: niches[Math.floor(Math.random() * niches.length)],
      campaign_budget_bracket: budgets[Math.floor(Math.random() * budgets.length)],
      campaign_duration_days: [7, 14, 21, 30, 45, 60][Math.floor(Math.random() * 6)],
      campaign_goal: filters.campaignGoal || "Sales Conversion",
      target_audience_age: ages[Math.floor(Math.random() * ages.length)],
      payment_model: paymentModels[Math.floor(Math.random() * paymentModels.length)],
      audience_female_pct: Math.random() * 100,
      audience_18_24_pct: Math.random() * 65,
      audience_25_34_pct: Math.random() * 60,
      audience_35plus_pct: Math.random() * 70,
    });
  }
  
  try {
    const result = await apiFetch('/recommend', {
      method: 'POST',
      body: JSON.stringify({
        pool,
        campaign_goal: filters.campaignGoal || 'Sales Conversion',
        top_n: 20,
        min_auth: 50,
        max_fake: 30,
        min_followers: filters.minFollowers || 1000,
        require_geo_match: false,
      }),
    });

    // Map backend ranked results back to frontend format
    const recs = (result.recommendations || []).map((rec, idx) => ({
      id: idx + 1,
      name: rec.influencer_id,
      category: rec.niche,
      platform: rec.platform,
      followers: rec.followers_count,
      engagement: parseFloat((rec.pred_er * 100).toFixed(2)),
      likes: rec.hist_avg_likes_per_post,
      comments: rec.hist_avg_comments_per_post,
      predictedROI: parseFloat(((rec.pred_cvr || 0) * 20).toFixed(0)),
      successScore: parseFloat(((rec.pred_success || 0) * 100).toFixed(0)),
      mlScore: parseFloat(((rec.composite_score || 0) * 100).toFixed(0)),
      color: ["#60a5fa", "#4ade80", "#c084fc", "#fb923c", "#f472b6", "#fbbf24"][idx % 6],
      // Backend ML fields
      pred_er: rec.pred_er,
      pred_cvr: rec.pred_cvr,
      pred_success: rec.pred_success,
      composite_score: rec.composite_score,
    }));

    // Apply client-side search/category/platform filters
    let filtered = recs;
    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter((i) => i.category === filters.category);
    }
    if (filters.platform && filters.platform !== 'All') {
      filtered = filtered.filter((i) => i.platform === filters.platform);
    }

    return filtered;
  } catch (error) {
    console.warn('Backend recommendation failed:', error.message);
    return [];
  }
};

// ─── Static data endpoints (kept as-is for display-only pages) ───────────────

export const getInfluencers = async () => {
  try {
    return await apiFetch('/influencers');
  } catch (error) {
    console.warn('Backend influencers failed, models not trained:', error.message);
    return [];
  }
};

export const getCampaigns = async () => {
  try {
    return await apiFetch('/campaigns');
  } catch (error) {
    console.warn('Backend campaigns failed, models not trained:', error.message);
    return [];
  }
};

export const createCampaign = async (data) => ({
  success: true,
  campaign: {
    id: `camp-${Date.now()}`,
    ...data,
    status: 'draft',
    spent: 0,
    metrics: { reach: 0, engagement: 0, conversions: 0, roi: 0 },
  },
});

export const getInvitations = async () => {
  try {
    return await apiFetch('/invitations');
  } catch (error) {
    console.warn('Backend invitations failed:', error.message);
    return [];
  }
};

export const getEarnings = async () => {
  try {
    return await apiFetch('/earnings');
  } catch (error) {
    console.warn('Backend earnings failed:', error.message);
    return { monthly: [], payments: [] };
  }
};

// Additional backend endpoints
export const getSchema = () => apiFetch('/schema');

export const validateInput = (data) => apiFetch('/validate', {
  method: 'POST',
  body: JSON.stringify(data)
});

export const getUncertainty = (records, nBootstrap = 50) => apiFetch('/uncertainty', {
  method: 'POST',
  body: JSON.stringify({ records, n_bootstrap: nBootstrap })
});

export const getShapImportance = () => apiFetch('/shap');

export const getColdStartMetrics = () => apiFetch('/cold-start');

export const getAnalytics = async () => {
  try {
    return await apiFetch('/analytics');
  } catch (error) {
    console.warn('Backend analytics failed, falling back to local data:', error.message);
    return {
      influencers: [],
      engagementTrends: [],
      roiPredictions: [],
      categoryPerformance: [],
      platformData: []
    };
  }
};

// Test function for backend integration
export const testBackendIntegration = async () => {
  try {
    const health = await checkHealth();
    console.log('Backend health:', health);
    
    const schema = await getSchema();
    console.log('Backend schema loaded');
    
    return { success: true, health, schema };
  } catch (error) {
    console.error('Backend test failed:', error);
    return { success: false, error: error.message };
  }
};