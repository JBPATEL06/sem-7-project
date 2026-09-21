import React, { createContext, useContext } from 'react';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const defaultContext: AuthContextType = {
  user: { id: 'local-dev-user', email: 'local@workspace.dev', role: 'admin' },
  token: 'local_dev_token',
  isAuthenticated: true,
  isAdmin: true,
  isLoading: false,
  login: async () => ({ success: true }),
  register: async () => ({ success: true }),
  logout: () => {}
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider value={defaultContext}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
