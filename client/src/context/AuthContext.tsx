import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoAccount: (email: string) => Promise<void>;
  switchProfile: (roleOrEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('diemp_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('diemp_token');
      if (storedToken) {
        try {
          const profile = await api.auth.getMe();
          setUser(profile);
          setToken(storedToken);
        } catch (err) {
          console.warn('Failed to restore official session:', err);
          localStorage.removeItem('diemp_token');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('diemp_token');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, pass);
      localStorage.setItem('diemp_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('diemp_token');
      setUser(null);
      setToken(null);
    }
  };

  const switchProfile = async (roleOrEmail: string) => {
    const roleEmailMap: Record<string, string> = {
      POLICE_OFFICER: 'police@demo.gov',
      INVESTIGATOR: 'investigator@demo.gov',
      FORENSIC_OFFICER: 'forensic@demo.gov',
      LEGAL_OFFICER: 'legal@demo.gov',
      COURT_USER: 'court@demo.gov',
      ADMIN: 'admin@demo.gov',
    };
    const targetEmail = roleEmailMap[roleOrEmail] || roleOrEmail;
    await login(targetEmail, 'DemoPass@2026');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        switchDemoAccount: switchProfile,
        switchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
