import {
  createContext,
  useState
} from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

// Shape of everything the context provides
interface AuthContextType {
  user:     User | null;
  token:    string | null;
  login:    (user: User, token: string, refreshToken: string) => void;
  logout:   () => void;
  isAdmin:  boolean;
  loading:  boolean;
}

// Create the context with a default value of null
const AuthContext = createContext<AuthContextType | null>(null);

// Provider wraps the whole app and makes auth available everywhere
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('accessToken');
  });

  const loading = false;

  function login(user: User, token: string, refreshToken: string) {
    // Save to state
    setUser(user);
    setToken(token);

    // Save to localStorage so it persists after refresh
    localStorage.setItem('accessToken',  token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user',         JSON.stringify(user));
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

export type { AuthContextType };
export { AuthContext };