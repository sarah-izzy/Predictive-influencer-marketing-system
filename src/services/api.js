const API_BASE = 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'influencerAI_token';

// ─── Helper ──────────────────────────────────────────────────────────────────
const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API request failed');
  }
  return res.json();
};

const apiDownload = async (path, options = {}) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Download failed');
  }
  return res.blob();
};

export const setAuthToken = (token) => {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const loginUser = (credentials) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

export const signupUser = (payload) =>
  apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getCurrentUser = () => apiFetch('/auth/me');

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
  const toNumber = (value, fallback = 0) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toInt = (value, fallback = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  // Derive budget bracket from raw budget number
  const rawBudget = toNumber(formData.budget, 5000);
  let budgetBracket = '$5K-$20K';
  if (rawBudget < 1000) budgetBracket = '<$1K';
  else if (rawBudget < 5000) budgetBracket = '$1K-$5K';
  else if (rawBudget < 20000) budgetBracket = '$5K-$20K';
  else if (rawBudget < 100000) budgetBracket = '$20K-$100K';
  else budgetBracket = '>$100K';

  // Derive influencer tier from follower count
  const followers = toNumber(formData.followers, 10000);
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
  const niche = nicheMap[formData.niche] || nicheMap[formData.category] || 'Lifestyle';
  const brandCategory = nicheMap[formData.brandCategory] || nicheMap[formData.category] || niche;

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

  const likes = toNumber(formData.likes);
  const comments = toNumber(formData.comments);
  const startDate = formData.startDate ? new Date(formData.startDate) : null;
  const endDate = formData.endDate ? new Date(formData.endDate) : null;
  const dateDuration = startDate && endDate && endDate >= startDate
    ? Math.max(1, Math.round((endDate - startDate) / 86400000) + 1)
    : null;
  const durationDays = dateDuration || toInt(formData.campaignDuration, 30);

  const payload = {
    followers_count: followers,
    hist_avg_likes_per_post: likes,
    hist_avg_comments_per_post: comments,
    fake_follower_pct: toNumber(formData.fakeFollowerPct, 8.0),
    audience_authenticity_score: toNumber(formData.authenticityScore, 80.0),
    brand_alignment_score: toNumber(formData.brandAlignment, 0.7),
    audience_age_match_score: toNumber(formData.ageMatchScore, 0.5),
    audience_geo_match: formData.geoMatch !== undefined ? toInt(formData.geoMatch, 1) : 1,
    hist_sentiment_score: toNumber(formData.sentimentScore, 0.65),
    hist_avg_shares_per_post: toNumber(formData.shares),
    hist_avg_saves_per_post: toNumber(formData.saves),
    audience_female_pct: toNumber(formData.femalePct, 50),
    account_age_years: toNumber(formData.accountAgeYears, 3),
    is_verified: toInt(formData.isVerified, 0),
    hist_avg_reach_per_post: toNumber(formData.reach, followers * 0.4),
    hist_posts_per_week: toNumber(formData.postsPerWeek, 4),
    audience_18_24_pct: toNumber(formData.audience18_24, 35),
    audience_25_34_pct: toNumber(formData.audience25_34, 30),
    audience_35plus_pct: toNumber(formData.audience35plus, 35),
    audience_concentration_score: toNumber(formData.audienceConcentrationScore, 0.65),
    reach_quality_score: toNumber(formData.reachQualityScore, 0.3),
    content_consistency_score: toNumber(formData.contentConsistencyScore, 50),
    campaign_duration_days: durationDays,
    primary_audience_geo: formData.primaryAudienceGeo || 'Nigeria',
    brand_category: brandCategory,
    target_audience_age: formData.targetAudienceAge || '25-34',
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
      engagement: parseFloat((rec.pred_er || 0).toFixed(2)),
      likes: rec.hist_avg_likes_per_post,
      comments: rec.hist_avg_comments_per_post,
      predictedROI: parseFloat(((rec.pred_roi || 0) * 100).toFixed(0)),
      successScore: parseFloat(((rec.pred_success || 0) * 100).toFixed(0)),
      mlScore: parseFloat((rec.grading?.overall || (rec.composite_score || 0) * 100).toFixed(0)),
      color: "#F97316",
      // Backend ML fields
      pred_er: rec.pred_er,
      pred_cvr: rec.pred_cvr,
      pred_revenue: rec.pred_revenue,
      pred_roi: rec.pred_roi,
      pred_success: rec.pred_success,
      composite_score: rec.composite_score,
      grading: rec.grading,
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

const budgetBracketFromAmount = (amount) => {
  const rawBudget = parseFloat(amount) || 5000;
  if (rawBudget < 1000) return '<$1K';
  if (rawBudget < 5000) return '$1K-$5K';
  if (rawBudget < 20000) return '$5K-$20K';
  if (rawBudget < 100000) return '$20K-$100K';
  return '>$100K';
};

const numberFrom = (...values) => {
  for (const value of values) {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export const getCampaignInfluencerRecommendations = async (campaign, influencers = []) => {
  const payload = campaign?.payload || {};
  const brandCategory = payload.brandCategory || payload.category || payload.brand_category || 'Lifestyle';
  const campaignGoal = payload.campaignGoal || payload.campaign_goal || 'Sales Conversion';
  const budgetBracket = payload.campaign_budget_bracket || budgetBracketFromAmount(payload.budget || campaign?.budget);
  const targetAudienceAge = payload.targetAudienceAge || payload.target_audience_age || '25-34';
  const paymentModel = payload.paymentModel || payload.payment_model || 'Flat Fee';
  const durationDays = numberFrom(payload.campaignDuration, payload.campaign_duration_days, 30);

  const pool = influencers.map((influencer) => {
    const profile = influencer.profile || {};
    const followers = numberFrom(profile.followersCount, profile.followers, influencer.followers, 10000);
    const niche = profile.niche || profile.category || influencer.category || 'Lifestyle';
    const categoryMatch = String(niche).toLowerCase() === String(brandCategory).toLowerCase();
    const likes = numberFrom(profile.hist_avg_likes_per_post, profile.avgLikes, followers * 0.05);
    const comments = numberFrom(profile.hist_avg_comments_per_post, profile.avgComments, followers * 0.005);

    return {
      influencer_id: influencer.name,
      followers_count: followers,
      hist_avg_likes_per_post: likes,
      hist_avg_comments_per_post: comments,
      hist_avg_shares_per_post: numberFrom(profile.hist_avg_shares_per_post, profile.avgShares),
      hist_avg_saves_per_post: numberFrom(profile.hist_avg_saves_per_post, profile.avgSaves),
      hist_avg_reach_per_post: numberFrom(profile.hist_avg_reach_per_post, profile.avgViews, followers * 0.4),
      fake_follower_pct: numberFrom(profile.fake_follower_pct, profile.fakeFollowerPct, 8),
      audience_authenticity_score: numberFrom(profile.audience_authenticity_score, profile.authenticityScore, 80),
      brand_alignment_score: Math.max(numberFrom(profile.brand_alignment_score, profile.brandAlignmentScore, categoryMatch ? 0.85 : 0.55), categoryMatch ? 0.85 : 0),
      audience_age_match_score: numberFrom(profile.audience_age_match_score, profile.audienceAgeMatchScore, 0.65),
      audience_geo_match: Number(numberFrom(profile.audience_geo_match, profile.audienceGeoMatch, 1)),
      hist_sentiment_score: numberFrom(profile.hist_sentiment_score, profile.sentimentScore, 0.7),
      account_age_years: numberFrom(profile.account_age_years, profile.accountAgeYears, 3),
      is_verified: Number(numberFrom(profile.is_verified, profile.isVerified, 0)),
      hist_posts_per_week: numberFrom(profile.hist_posts_per_week, profile.postsPerWeek, 4),
      audience_female_pct: numberFrom(profile.audience_female_pct, profile.audienceFemalePct, 50),
      audience_18_24_pct: numberFrom(profile.audience_18_24_pct, 35),
      audience_25_34_pct: numberFrom(profile.audience_25_34_pct, 30),
      audience_35plus_pct: numberFrom(profile.audience_35plus_pct, 35),
      audience_concentration_score: numberFrom(profile.audience_concentration_score, profile.audienceConcentrationScore, 0.65),
      reach_quality_score: numberFrom(profile.reach_quality_score, profile.reachQualityScore, 0.3),
      content_consistency_score: numberFrom(profile.content_consistency_score, profile.contentConsistencyScore, 50),
      platform: profile.platform || 'Instagram',
      niche,
      influencer_tier: profile.influencerTier || influencer.tier || 'Micro',
      primary_audience_geo: profile.primary_audience_geo || profile.primaryAudienceGeo || 'Nigeria',
      brand_category: brandCategory,
      campaign_budget_bracket: budgetBracket,
      campaign_duration_days: durationDays,
      campaign_goal: campaignGoal,
      target_audience_age: targetAudienceAge,
      payment_model: paymentModel,
      audience_geo_label: profile.primaryAudienceGeo || profile.primary_audience_geo || 'Nigeria',
      rule_min_followers_met: followers >= 1000 ? 1 : 0,
      rule_niche_match: categoryMatch || numberFrom(profile.brand_alignment_score, profile.brandAlignmentScore, 0) >= 0.5 ? 1 : 0,
      rule_budget_feasible: 1,
    };
  });

  if (!pool.length) {
    return { recommendations: [], filtered: 0, passed: 0, campaign_goal: campaignGoal };
  }

  const result = await apiFetch('/recommend', {
    method: 'POST',
    body: JSON.stringify({
      pool,
      campaign_goal: campaignGoal,
      top_n: Math.min(20, pool.length),
      min_auth: 50,
      max_fake: 30,
      min_followers: 1000,
      require_geo_match: false,
    }),
  });

  return {
    ...result,
    recommendations: (result.recommendations || []).map((rec, idx) => ({
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
    })),
  };
};

export const getRegisteredInfluencers = () => apiFetch('/brand/influencers');

export const createRegisteredInfluencer = (payload) =>
  apiFetch('/brand/influencers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateRegisteredInfluencer = (id, payload) =>
  apiFetch(`/brand/influencers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deleteRegisteredInfluencer = (id) =>
  apiFetch(`/brand/influencers/${id}`, {
    method: 'DELETE',
  });

export const getCampaigns = async () => {
  try {
    return await apiFetch('/campaigns');
  } catch (error) {
    console.warn('Backend campaigns failed:', error.message);
    return [];
  }
};

export const getCampaignRecommendations = (campaignId) =>
  apiFetch(`/campaigns/${campaignId}/recommendations`);

export const exportRecommendationsCsv = (payload) =>
  apiDownload('/recommend/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createCampaign = async (data) =>
  apiFetch('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const selectCampaignInfluencers = (campaignId, influencers, message = '') =>
  apiFetch(`/campaigns/${campaignId}/select`, {
    method: 'POST',
    body: JSON.stringify({ influencers, message }),
  });

export const launchCampaign = (campaignId) =>
  apiFetch(`/campaigns/${campaignId}/launch`, {
    method: 'POST',
  });

export const completeCampaign = (campaignId, actualResults) =>
  apiFetch(`/campaigns/${campaignId}/complete`, {
    method: 'POST',
    body: JSON.stringify(actualResults),
  });

export const getCampaignReportPdf = (campaignId) =>
  apiDownload(`/campaigns/${campaignId}/report`);

export const getInvitations = async () => {
  try {
    return await apiFetch('/invitations');
  } catch (error) {
    console.warn('Backend invitations failed:', error.message);
    return [];
  }
};

export const respondToInvitation = (invitationId, status) =>
  apiFetch(`/invitations/${invitationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });

export const getInfluencerProfile = async () => {
  try {
    return await apiFetch('/profile');
  } catch (error) {
    console.warn('Backend profile failed:', error.message);
    return null;
  }
};

export const updateInfluencerProfile = (profile) =>
  apiFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });

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
