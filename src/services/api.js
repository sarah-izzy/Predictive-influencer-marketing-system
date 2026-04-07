import { influencers, campaigns, campaignInvitations, earningsData, paymentHistory } from '../data/dummyData';

const API_BASE = '/api';

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
 * Build a pool of influencer dicts from dummyData,
 * send to POST /recommend for ML-ranked results.
 */
export const getRecommendedInfluencers = async (filters = {}) => {
  // Build pool from local influencer data with backend-required fields
  const pool = influencers.map((inf) => {
    const nicheMap = {
      Tech: 'Tech', Health: 'Health', Gaming: 'Gaming',
      Lifestyle: 'Lifestyle', Food: 'Food', Fashion: 'Fashion',
      Beauty: 'Beauty', Fitness: 'Fitness', Travel: 'Travel', Finance: 'Finance',
    };

    return {
      influencer_id: `INF${String(inf.id).padStart(4, '0')}`,
      followers_count: inf.followers,
      hist_avg_likes_per_post: inf.likes,
      hist_avg_comments_per_post: inf.comments,
      hist_avg_reach_per_post: inf.avgViews || inf.followers * 0.25,
      fake_follower_pct: 8.0,
      audience_authenticity_score: 82.0,
      brand_alignment_score: inf.successScore / 100,
      audience_age_match_score: 0.5,
      audience_geo_match: 1,
      hist_sentiment_score: 0.7,
      engagement_per_follower: inf.engagement / 100,
      interaction_velocity: Math.min(0.4, inf.comments / (inf.likes + 1)),
      reach_quality_score: 0.35,
      content_consistency_score: 55,
      audience_concentration_score: 0.65,
      hist_posts_per_week: 4.0,
      hist_avg_shares_per_post: inf.likes * 0.09,
      hist_avg_saves_per_post: inf.likes * 0.07,
      account_age_years: 3.0,
      is_verified: inf.followers > 100000 ? 1 : 0,
      platform: inf.platform || 'Instagram',
      niche: nicheMap[inf.category] || 'Lifestyle',
      influencer_tier:
        inf.followers < 10000 ? 'Nano' :
        inf.followers < 100000 ? 'Micro' :
        inf.followers < 500000 ? 'Mid-Tier' :
        inf.followers < 1000000 ? 'Macro' : 'Mega',
      primary_audience_geo: 'Nigeria',
      brand_category: nicheMap[inf.category] || 'Tech',
      campaign_budget_bracket: '$5K-$20K',
      campaign_duration_days: 30,
      campaign_goal: filters.campaignGoal || 'Sales Conversion',
      target_audience_age: '25-34',
      payment_model: 'Flat Fee',
      audience_female_pct: 55,
      audience_18_24_pct: 35,
      audience_25_34_pct: 30,
      audience_35plus_pct: 35,
      // Keep original frontend fields for display
      _name: inf.name,
      _color: inf.color,
      _rate: inf.rate,
      _category: inf.category,
      _platform: inf.platform,
    };
  });

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

    // Merge backend scores back with original display data
    const recs = (result.recommendations || []).map((rec, idx) => {
      const original = influencers.find(
        (inf) => `INF${String(inf.id).padStart(4, '0')}` === rec.influencer_id
      );
      return {
        id: original?.id || idx + 1,
        name: original?.name || rec.influencer_id,
        category: original?.category || rec.niche,
        platform: original?.platform || rec.platform,
        followers: rec.followers_count || original?.followers,
        engagement: parseFloat((rec.pred_er || 0).toFixed(2)),
        likes: original?.likes || 0,
        comments: original?.comments || 0,
        predictedROI: parseFloat(((rec.pred_cvr || 0) * 20).toFixed(0)),
        successScore: parseFloat(((rec.pred_success || 0) * 100).toFixed(0)),
        mlScore: parseFloat(((rec.composite_score || 0) * 100).toFixed(0)),
        color: original?.color || '#6366f1',
        rate: original?.rate || 0,
        // Backend ML fields
        pred_er: rec.pred_er,
        pred_cvr: rec.pred_cvr,
        pred_success: rec.pred_success,
        composite_score: rec.composite_score,
      };
    });

    // Apply client-side search/category/platform filters
    let filtered = recs;
    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter((i) => i.category === filters.category);
    }
    if (filters.platform && filters.platform !== 'All') {
      filtered = filtered.filter((i) => i.platform === filters.platform);
    }

    return filtered;
  } catch (err) {
    console.warn('Backend /recommend failed, falling back to local data:', err.message);
    // Fallback: return local data with simple scoring
    return influencers.map((i) => ({
      ...i,
      mlScore: Math.round(
        i.successScore * 0.4 +
        i.engagement * 8 +
        (i.predictedROI / 210) * 20 +
        Math.min(20, (i.followers / 210000) * 20)
      ),
    }));
  }
};

// ─── Static data endpoints (kept as-is for display-only pages) ───────────────

export const getInfluencers = async () => influencers;

export const getCampaigns = async () => campaigns;

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

export const getInvitations = async () => campaignInvitations;

export const getEarnings = async () => ({ monthly: earningsData, payments: paymentHistory });