import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Save, Search, Trash2, Users, X } from 'lucide-react';
import {
  createRegisteredInfluencer,
  deleteRegisteredInfluencer,
  getRegisteredInfluencers,
  updateRegisteredInfluencer,
} from '../../services/api';

const emptyForm = {
  name: '',
  email: '',
  username: '',
  password: 'password123',
  category: 'Lifestyle',
  followers: 10000,
  platform: 'Instagram',
  tier: 'Micro',
  authenticityScore: 80,
  engagementRate: 4.5,
};

const categories = ['Lifestyle', 'Tech', 'Fashion', 'Gaming', 'Health', 'Food', 'Beauty', 'Fitness', 'Travel', 'Finance'];
const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook'];
const tiers = ['Nano', 'Micro', 'Mid-Tier', 'Macro', 'Mega'];

const InfluencerManagement = () => {
  const [influencers, setInfluencers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadInfluencers = async () => {
    setLoading(true);
    try {
      const data = await getRegisteredInfluencers();
      setInfluencers(data || []);
    } catch (error) {
      setMessage(error.message || 'Unable to load influencers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfluencers();
  }, []);

  const displayed = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return influencers;
    return influencers.filter((inf) =>
      [inf.name, inf.email, inf.username, inf.category, inf.profile?.platform]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [influencers, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
  };

  const startEdit = (influencer) => {
    setEditingId(influencer.id);
    setForm({
      name: influencer.name || '',
      email: influencer.email || '',
      username: influencer.username || '',
      password: 'password123',
      category: influencer.category || 'Lifestyle',
      followers: influencer.followers || 0,
      platform: influencer.profile?.platform || 'Instagram',
      tier: influencer.tier || influencer.profile?.influencerTier || 'Micro',
      authenticityScore: influencer.profile?.authenticityScore || 80,
      engagementRate: influencer.profile?.engagementRate || 4.5,
    });
    setMessage('');
  };

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const payloadFromForm = () => ({
    name: form.name,
    email: form.email,
    username: form.username,
    ...(editingId ? {} : { password: form.password }),
    category: form.category,
    followers: Number(form.followers),
    tier: form.tier,
    profile: {
      displayName: form.name,
      category: form.category,
      niche: form.category,
      platform: form.platform,
      influencerTier: form.tier,
      followersCount: Number(form.followers),
      followers: Number(form.followers),
      authenticityScore: Number(form.authenticityScore),
      engagementRate: Number(form.engagementRate),
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      if (editingId) {
        await updateRegisteredInfluencer(editingId, payloadFromForm());
        setMessage('Influencer updated.');
      } else {
        await createRegisteredInfluencer(payloadFromForm());
        setMessage('Influencer created.');
      }
      resetForm();
      await loadInfluencers();
    } catch (error) {
      setMessage(error.message || 'Unable to save influencer.');
    }
  };

  const handleDelete = async (influencer) => {
    const confirmed = window.confirm(`Delete ${influencer.name}? This removes the influencer account and profile.`);
    if (!confirmed) return;
    try {
      await deleteRegisteredInfluencer(influencer.id);
      setMessage('Influencer deleted.');
      await loadInfluencers();
    } catch (error) {
      setMessage(error.message || 'Unable to delete influencer.');
    }
  };

  return (
    <div>
      <h2 className="page-title">Registered Influencers</h2>
      <p className="page-subtitle">View, create, edit, and remove influencer accounts available to brand managers</p>

      <div className="prediction-grid">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {editingId ? <Edit3 size={18} color="white" /> : <Plus size={18} color="white" />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>
                {editingId ? 'Edit Influencer' : 'Add Influencer'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                Managed influencers are stored as real registered users
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" name="username" value={form.username} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              {!editingId && (
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input className="form-input" name="password" value={form.password} onChange={handleChange} required minLength={6} />
                </div>
              )}
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <select className="form-select" name="platform" value={form.platform} onChange={handleChange}>
                  {platforms.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tier</label>
                <select className="form-select" name="tier" value={form.tier} onChange={handleChange}>
                  {tiers.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label className="form-label">Followers</label>
                <input className="form-input" type="number" min="0" name="followers" value={form.followers} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Authenticity Score</label>
                <input className="form-input" type="number" min="0" max="100" name="authenticityScore" value={form.authenticityScore} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Engagement Rate (%)</label>
                <input className="form-input" type="number" min="0" max="100" step="0.01" name="engagementRate" value={form.engagementRate} onChange={handleChange} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" type="submit">
                <Save size={16} />
                {editingId ? 'Save Changes' : 'Create Influencer'}
              </button>
              {editingId && (
                <button className="btn-edit" type="button" onClick={resetForm}>
                  <X size={16} />
                  Cancel
                </button>
              )}
            </div>
          </form>

          {message && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gray-700)' }}>{message}</div>}
        </div>

        <div className="glass-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Influencer Directory</div>
              <div className="chart-card-subtitle">{displayed.length} registered influencer{displayed.length === 1 ? '' : 's'}</div>
            </div>
            <Users size={18} color="var(--primary-600)" />
          </div>
          <div className="search-bar" style={{ marginBottom: 16 }}>
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, category..." />
          </div>
          <div className="rankings-table-wrapper">
            <table className="rankings-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Platform</th>
                  <th>Followers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Loading influencers...</td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan="5">No influencers found.</td></tr>
                ) : displayed.map((inf) => (
                  <tr key={inf.id}>
                    <td>
                      <div className="influencer-info">
                        <div className="influencer-avatar" style={{ background: 'var(--primary-600)' }}>{inf.name.charAt(0)}</div>
                        <div>
                          <div className="influencer-name">{inf.name}</div>
                          <div className="influencer-category">{inf.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`category-badge category-${String(inf.category).toLowerCase()}`}>{inf.category}</span></td>
                    <td style={{ color: 'var(--gray-700)' }}>{inf.profile?.platform || 'Instagram'}</td>
                    <td style={{ color: 'var(--gray-900)', fontWeight: 700 }}>{Number(inf.followers || 0).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-edit" type="button" onClick={() => startEdit(inf)} style={{ padding: '6px 10px' }}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn-edit" type="button" onClick={() => handleDelete(inf)} style={{ padding: '6px 10px', color: 'var(--danger-500)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfluencerManagement;
