import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Camera, Globe, DollarSign, Save, Eye } from 'lucide-react';

const InfluencerProfile = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    displayName: user?.name || 'Travel Vibes',
    bio: 'Passionate about discovering hidden gems around the world. I share authentic travel experiences, tips, and lifestyle content that inspires my community to explore!',
    category: user?.category || 'Lifestyle',
    platforms: ['Instagram', 'TikTok'],
    ratePerPost: 2500,
    ratePerStory: 800,
    ratePerReel: 1500,
    location: 'Los Angeles, CA',
    website: 'travelvibes.com',
    languages: 'English, Spanish',
  });

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setEditing(false);
    // Mock save
  };

  return (
    <div>
      <h2 className="page-title">My Profile</h2>
      <p className="page-subtitle">Manage how brands see your profile</p>

      <div className="profile-layout">
        {/* Edit Form */}
        <div className="glass-card profile-form-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Profile Information</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  {editing ? 'Edit your public profile' : 'View your public profile'}
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

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text" name="displayName" className="form-input"
              value={profile.displayName} onChange={handleChange} disabled={!editing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              name="bio" className="form-textarea"
              rows={4} value={profile.bio} onChange={handleChange} disabled={!editing}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className="form-select" value={profile.category} onChange={handleChange} disabled={!editing}>
                <option>Lifestyle</option>
                <option>Tech</option>
                <option>Fashion</option>
                <option>Gaming</option>
                <option>Health</option>
                <option>Food</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input type="text" name="location" className="form-input" value={profile.location} onChange={handleChange} disabled={!editing} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Website</label>
              <input type="text" name="website" className="form-input" value={profile.website} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Languages</label>
              <input type="text" name="languages" className="form-input" value={profile.languages} onChange={handleChange} disabled={!editing} />
            </div>
          </div>

          <div className="form-section-label" style={{ marginTop: 8 }}>Rates</div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Per Post ($)</label>
              <input type="number" name="ratePerPost" className="form-input" value={profile.ratePerPost} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Per Story ($)</label>
              <input type="number" name="ratePerStory" className="form-input" value={profile.ratePerStory} onChange={handleChange} disabled={!editing} />
            </div>
            <div className="form-group">
              <label className="form-label">Per Reel ($)</label>
              <input type="number" name="ratePerReel" className="form-input" value={profile.ratePerReel} onChange={handleChange} disabled={!editing} />
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="glass-card profile-preview-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="profile-preview-avatar" style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}>
              {profile.displayName.charAt(0)}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginTop: 12 }}>{profile.displayName}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>{profile.category} Creator</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{profile.location}</div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--gray-400)', lineHeight: 1.6, textAlign: 'center', marginBottom: 20 }}>
            {profile.bio}
          </p>

          <div className="profile-preview-stats">
            <div className="profile-preview-stat">
              <div className="profile-preview-stat-val">45K</div>
              <div className="profile-preview-stat-label">Followers</div>
            </div>
            <div className="profile-preview-stat">
              <div className="profile-preview-stat-val">8.5%</div>
              <div className="profile-preview-stat-label">Engagement</div>
            </div>
            <div className="profile-preview-stat">
              <div className="profile-preview-stat-val">22K</div>
              <div className="profile-preview-stat-label">Avg Views</div>
            </div>
          </div>

          <div className="profile-preview-rates">
            <div className="profile-preview-rate">
              <Camera size={14} />
              <span>Post: ${profile.ratePerPost.toLocaleString()}</span>
            </div>
            <div className="profile-preview-rate">
              <Globe size={14} />
              <span>Story: ${profile.ratePerStory.toLocaleString()}</span>
            </div>
            <div className="profile-preview-rate">
              <DollarSign size={14} />
              <span>Reel: ${profile.ratePerReel.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>
              This is how brands will see your profile
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfluencerProfile;
