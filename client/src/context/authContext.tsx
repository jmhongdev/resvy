import {
  createContext,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

// Types

export interface AuthContextType {
  user:    User | null;
  token:   string | null;
  login:   (user: User, accessToken: string, refreshToken: string) => void;
  logout:  () => void;
  isAdmin: boolean;
  loading: boolean;
}

// Context
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null);

// Provider 

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      // Corrupted localStorage — clear and start fresh
      localStorage.removeItem('user');
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('accessToken')
  );

  // loading is always false, initialize from localStorage synchronously
  const loading = false;

  function login(newUser: User, accessToken: string, refreshToken: string) {
    setUser(newUser);
    setToken(accessToken);
    localStorage.setItem('accessToken',  accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(newUser));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}