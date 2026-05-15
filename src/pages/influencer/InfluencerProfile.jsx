import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Save, Eye } from 'lucide-react';
import { getInfluencerProfile, updateInfluencerProfile } from '../../services/api';

const categories = ['Lifestyle', 'Tech', 'Fashion', 'Gaming', 'Health', 'Food', 'Beauty', 'Fitness', 'Travel', 'Finance'];
const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook'];
const tiers = ['Nano', 'Micro', 'Mid-Tier', 'Macro', 'Mega'];

const numberValue = (value) => Number(value || 0);

const InfluencerProfile = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(true);
  const [profile, setProfile] = useState({
    displayName: user?.name || 'Travel Vibes',
    bio: 'Passionate about creating authentic content and helping brands reach the right audience.',
    category: user?.category || 'Lifestyle',
    niche: user?.category || 'Lifestyle',
    platform: 'Instagram',
    influencerTier: user?.tier || 'Micro',
    followersCount: user?.followers || 10000,
    location: 'Lagos, Nigeria',
    website: '',
    languages: 'English',
    primaryHandle: '',
    mediaKitUrl: '',
    avgLikes: 2500,
    avgComments: 250,
    avgShares: 80,
    avgSaves: 120,
    avgViews: 18000,
    engagementRate: 4.5,
    authenticityScore: 85,
    fakeFollowerPct: 8,
    audienceFemalePct: 55,
    audience18_24Pct: 35,
    audience25_34Pct: 40,
    audience35PlusPct: 25,
    primaryAudienceGeo: 'Nigeria',
    audienceGeoMatch: 1,
    sentimentScore: 0.72,
    reachQualityScore: 0.45,
    contentConsistencyScore: 78,
    postsPerWeek: 4,
    historicalConversions: 120,
    historicalRevenue: 5000,
    campaignSuccessRate: 75,
    ratePerPost: 2500,
    ratePerStory: 800,
    ratePerReel: 1500,
  });
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const data = await getInfluencerProfile();
      if (data) {
        setProfile((prev) => ({
          ...prev,
          ...data,
          followersCount: data.followersCount ?? data.followers ?? prev.followersCount,
          platform: data.platform ?? data.platforms?.[0] ?? prev.platform,
          niche: data.niche ?? data.category ?? prev.niche,
        }));
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: type === 'number' ? value : value,
    }));
  };

  const handleSave = async () => {
    const normalized = {
      ...profile,
      category: profile.niche || profile.category,
      platforms: [profile.platform],
      followers: numberValue(profile.followersCount),
      followersCount: numberValue(profile.followersCount),
      avgLikes: numberValue(profile.avgLikes),
      avgComments: numberValue(profile.avgComments),
      avgShares: numberValue(profile.avgShares),
      avgSaves: numberValue(profile.avgSaves),
      avgViews: numberValue(profile.avgViews),
      engagementRate: numberValue(profile.engagementRate),
      authenticityScore: numberValue(profile.authenticityScore),
      fakeFollowerPct: numberValue(profile.fakeFollowerPct),
      audienceFemalePct: numberValue(profile.audienceFemalePct),
      audience18_24Pct: numberValue(profile.audience18_24Pct),
      audience25_34Pct: numberValue(profile.audience25_34Pct),
      audience35PlusPct: numberValue(profile.audience35PlusPct),
      audienceGeoMatch: numberValue(profile.audienceGeoMatch),
      sentimentScore: numberValue(profile.sentimentScore),
      reachQualityScore: numberValue(profile.reachQualityScore),
      contentConsistencyScore: numberValue(profile.contentConsistencyScore),
      postsPerWeek: numberValue(profile.postsPerWeek),
      historicalConversions: numberValue(profile.historicalConversions),
      historicalRevenue: numberValue(profile.historicalRevenue),
      campaignSuccessRate: numberValue(profile.campaignSuccessRate),
      ratePerPost: numberValue(profile.ratePerPost),
      ratePerStory: numberValue(profile.ratePerStory),
      ratePerReel: numberValue(profile.ratePerReel),
    };
    try {
      await updateInfluencerProfile(normalized);
      setProfile(normalized);
      setSaveMessage('Profile saved for brand grading and campaign matching.');
      setEditing(false);
    } catch (error) {
      setSaveMessage(error.message || 'Unable to save profile.');
    }
  };

  return (
    <div>
      <h2 className="page-title">My Profile</h2>
      <p className="page-subtitle">Upload the details brands need to grade and match your influencer profile</p>

      <div className="profile-layout">
        <div className="glass-card profile-form-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: '#F97316',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-900)' }}>Profile Setup</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  {editing ? 'Complete your grading and campaign matching data' : 'Your profile is ready for brand review'}
                </div>
              </div>
            </div>
            <button
              className={editing ? 'btn-save' : 'btn-edit'}
              onClick={editing ? handleSave : () => setEditing(true)}
            >
              {editing ? <><Save size={14} /> Save</> : <><Eye size={14} /> Edit</>}
            </button>
          </div>

          <div className="form-section-label">Public Identity</div>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input type="text" name="displayName" className="form-input" value={profile.displayName} onChange={handleChange} disabled={!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea name="bio" className="form-textarea" rows={4} value={profile.bio} onChange={handleChange} disabled={!editing} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Primary Platform</label>
              <select name="platform" className="form-select" value={profile.platform} onChange={handleChange} disabled={!editing}>
                {platforms.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Niche / Category</label>
              <select name="niche" className="form-select" value={profile.niche} onChange={handleChange} disabled={!editing}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Influencer Tier</label>
              <select name="influencerTier" className="form-select" value={profile.influencerTier} onChange={handleChange} disabled={!editing}>
                {tiers.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Followers Count</label>
              <input type="number" min="0" name="followersCount" className="form-input" value={profile.followersCount} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Handle</label>
              <input type="text" name="primaryHandle" className="form-input" value={profile.primaryHandle} onChange={handleChange} disabled={!editing} />
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop: 8 }}>Engagement Metrics</div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Avg Likes/Post</label>
              <input type="number" min="0" name="avgLikes" className="form-input" value={profile.avgLikes} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Avg Comments/Post</label>
              <input type="number" min="0" name="avgComments" className="form-input" value={profile.avgComments} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Avg Views/Post</label>
              <input type="number" min="0" name="avgViews" className="form-input" value={profile.avgViews} onChange={handleChange} disabled={!editing} />
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Avg Shares/Post</label>
              <input type="number" min="0" name="avgShares" className="form-input" value={profile.avgShares} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Avg Saves/Post</label>
              <input type="number" min="0" name="avgSaves" className="form-input" value={profile.avgSaves} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Engagement Rate (%)</label>
              <input type="number" min="0" max="100" step="0.01" name="engagementRate" className="form-input" value={profile.engagementRate} onChange={handleChange} disabled={!editing} />
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop: 8 }}>Audience and Authenticity</div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Authenticity Score</label>
              <input type="number" min="0" max="100" name="authenticityScore" className="form-input" value={profile.authenticityScore} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Fake Follower %</label>
              <input type="number" min="0" max="100" step="0.1" name="fakeFollowerPct" className="form-input" value={profile.fakeFollowerPct} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Audience Female %</label>
              <input type="number" min="0" max="100" step="0.1" name="audienceFemalePct" className="form-input" value={profile.audienceFemalePct} onChange={handleChange} disabled={!editing} />
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Audience 18-24 %</label>
              <input type="number" min="0" max="100" step="0.1" name="audience18_24Pct" className="form-input" value={profile.audience18_24Pct} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Audience 25-34 %</label>
              <input type="number" min="0" max="100" step="0.1" name="audience25_34Pct" className="form-input" value={profile.audience25_34Pct} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Audience 35+ %</label>
              <input type="number" min="0" max="100" step="0.1" name="audience35PlusPct" className="form-input" value={profile.audience35PlusPct} onChange={handleChange} disabled={!editing} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Primary Audience Geo</label>
              <input type="text" name="primaryAudienceGeo" className="form-input" value={profile.primaryAudienceGeo} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Geo Match Ready</label>
              <select name="audienceGeoMatch" className="form-select" value={profile.audienceGeoMatch} onChange={handleChange} disabled={!editing}>
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop: 8 }}>Quality and Historical Performance</div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Sentiment Score</label>
              <input type="number" min="0" max="1" step="0.01" name="sentimentScore" className="form-input" value={profile.sentimentScore} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Reach Quality Score</label>
              <input type="number" min="0" max="1" step="0.01" name="reachQualityScore" className="form-input" value={profile.reachQualityScore} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Consistency Score</label>
              <input type="number" min="0" max="100" name="contentConsistencyScore" className="form-input" value={profile.contentConsistencyScore} onChange={handleChange} disabled={!editing} />
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Posts Per Week</label>
              <input type="number" min="0" step="0.1" name="postsPerWeek" className="form-input" value={profile.postsPerWeek} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Historical Conversions</label>
              <input type="number" min="0" name="historicalConversions" className="form-input" value={profile.historicalConversions} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Campaign Success Rate (%)</label>
              <input type="number" min="0" max="100" name="campaignSuccessRate" className="form-input" value={profile.campaignSuccessRate} onChange={handleChange} disabled={!editing} />
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop: 8 }}>Contact, Proof and Rates</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Website</label>
              <input type="text" name="website" className="form-input" value={profile.website} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Media Kit URL</label>
              <input type="text" name="mediaKitUrl" className="form-input" value={profile.mediaKitUrl} onChange={handleChange} disabled={!editing} />
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Per Post (₦)</label>
              <input type="number" min="0" name="ratePerPost" className="form-input" value={profile.ratePerPost} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Per Story (₦)</label>
              <input type="number" min="0" name="ratePerStory" className="form-input" value={profile.ratePerStory} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Per Reel (₦)</label>
              <input type="number" min="0" name="ratePerReel" className="form-input" value={profile.ratePerReel} onChange={handleChange} disabled={!editing} />
            </div>
          </div>

          {saveMessage && (
            <div style={{ fontSize: 13, color: 'var(--gray-700)', marginTop: 12 }}>{saveMessage}</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default InfluencerProfile;
