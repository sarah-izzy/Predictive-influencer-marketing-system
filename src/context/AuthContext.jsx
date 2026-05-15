/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { getAuthToken, getCurrentUser, loginUser, setAuthToken, signupUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(() => {
    const saved = localStorage.getItem('influencerAI_role');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const restoreSession = async () => {
      const token = getAuthToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await getCurrentUser();
        setUser(data.user);
        setSelectedRole(data.user.role);
      } catch {
        setAuthToken(null);
        setUser(null);
        setSelectedRole(null);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

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

  const login = async (email, username, password, role) => {
    const data = await loginUser({ email, username, password, role });
    setAuthToken(data.token);
    setUser(data.user);
    setSelectedRole(data.user.role);
    return data.user;
  };

  const signup = async ({ name, email, username, password, role, category, followers }) => {
    const data = await signupUser({ name, email, username, password, role, category, followers });
    setAuthToken(data.token);
    setUser(data.user);
    setSelectedRole(data.user.role);
    return data.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setSelectedRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        authLoading,
        isAuthenticated: !!user,
        selectedRole,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
