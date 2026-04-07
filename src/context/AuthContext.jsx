import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const mockUsers = {
  brand: {
    id: 'brand-001',
    name: 'Acme Marketing',
    email: 'sarah@acmemarketing.com',
    role: 'brand',
    avatar: 'A',
    company: 'Acme Corp',
  },
  influencer: {
    id: 'inf-004',
    name: 'Travel Vibes',
    email: 'travel@vibes.com',
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

  useEffect(() => {
    if (user) {
      localStorage.setItem('influencerAI_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('influencerAI_user');
    }
  }, [user]);

  const login = (role) => {
    const userData = mockUsers[role];
    setUser(userData);
    return userData;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
