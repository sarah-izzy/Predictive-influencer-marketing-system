import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const mockUsers = {
  'brand@test.com': {
    id: 'brand-001',
    name: 'Acme Marketing',
    email: 'brand@test.com',
    username: 'brand_user',
    role: 'brand',
    avatar: 'A',
    company: 'Acme Corp',
  },
  'influencer@test.com': {
    id: 'inf-004',
    name: 'Travel Vibes',
    email: 'influencer@test.com',
    username: 'travel_vibes',
    role: 'influencer',
    avatar: 'T',
    category: 'Lifestyle',
    followers: 45000,
    tier: 'Rising Star',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('influencerAI_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedRole, setSelectedRole] = useState(() => {
    const saved = localStorage.getItem('influencerAI_role');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('influencerAI_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('influencerAI_user');
    }
  }, [user]);

  useEffect(() => {
    if (selectedRole) {
      localStorage.setItem('influencerAI_role', JSON.stringify(selectedRole));
    } else {
      localStorage.removeItem('influencerAI_role');
    }
  }, [selectedRole]);

  const setRole = (role) => {
    setSelectedRole(role);
  };

  // Demo login - in production, this would make an API call
  const login = (email, username, password, role) => {
    // For demo purposes, accept any credentials if role is set
    const userData = {
      id: role === 'brand' ? `brand-${Date.now()}` : `inf-${Date.now()}`,
      name: username,
      email: email,
      username: username,
      role: role,
      avatar: username.charAt(0).toUpperCase(),
      ...(role === 'brand' ? { company: 'Demo Company' } : { category: 'Lifestyle', followers: 10000, tier: 'Growing' }),
    };
    setUser(userData);
    setSelectedRole(role);
    return userData;
  };

  const logout = () => {
    setUser(null);
    setSelectedRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, selectedRole, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
