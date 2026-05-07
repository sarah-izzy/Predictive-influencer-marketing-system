const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildInfluencerPerformanceFromProfile = (profile = {}) => {
  const followers = numberValue(profile.followersCount ?? profile.followers, 0);
  const engagement = numberValue(profile.engagementRate, 0);
  const likes = numberValue(profile.avgLikes, 0);
  const comments = numberValue(profile.avgComments, 0);
  const reach = numberValue(profile.avgViews, 0);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return months.map((month, index) => {
    const ratio = 0.72 + index * (0.28 / 11);
    return {
      month,
      followers: Math.round(followers * ratio),
      engagement: Number((engagement * (0.88 + index * (0.12 / 11))).toFixed(2)),
      likes: Math.round(likes * ratio),
      comments: Math.round(comments * ratio),
      reach: Math.round(reach * ratio),
    };
  });
};

export const buildContentPerformanceFromProfile = (profile = {}) => {
  const likes = numberValue(profile.avgLikes, 0);
  const comments = numberValue(profile.avgComments, 0);
  const reach = numberValue(profile.avgViews, 0);
  const postsPerWeek = numberValue(profile.postsPerWeek, 1);
  const monthlyPosts = Math.max(1, Math.round(postsPerWeek * 4));

  return [
    { type: 'Reels', avgLikes: Math.round(likes * 1.15), avgComments: Math.round(comments * 1.1), avgReach: Math.round(reach * 1.2), posts: monthlyPosts },
    { type: 'Photos', avgLikes: Math.round(likes * 0.9), avgComments: Math.round(comments * 0.85), avgReach: Math.round(reach * 0.8), posts: monthlyPosts },
    { type: 'Stories', avgLikes: Math.round(likes * 0.55), avgComments: Math.round(comments * 0.5), avgReach: Math.round(reach * 0.65), posts: monthlyPosts * 2 },
    { type: 'Carousels', avgLikes: Math.round(likes), avgComments: Math.round(comments), avgReach: Math.round(reach), posts: Math.max(1, Math.round(monthlyPosts / 2)) },
  ];
};

export const currentInfluencerStats = (profile = {}) => ({
  followers: numberValue(profile.followersCount ?? profile.followers, 0),
  engagement: numberValue(profile.engagementRate, 0),
  reach: numberValue(profile.avgViews, 0),
  likes: numberValue(profile.avgLikes, 0),
  comments: numberValue(profile.avgComments, 0),
  authenticity: numberValue(profile.authenticityScore, 0),
  consistency: numberValue(profile.contentConsistencyScore, 0),
});
