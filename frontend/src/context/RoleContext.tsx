import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, UserRole } from '../mocks/types';
import { getCurrentUser, loginUser, UNAUTHORIZED_EVENT } from '../lib/api';

const TOKEN_KEY = 'legal_ai_token';
const ROLE_KEY = 'legal_ai_role';

/** Seeded demo accounts (backend/scripts/seed_demo_users.py) used by the dev role switcher.
 *  There is no demo admin — admins are the fixed accounts in the backend's ADMIN_EMAILS. */
const DEMO_ACCOUNTS: Partial<Record<UserRole, string>> = {
  citizen: 'citizen@example.com',
  lawyer: 'advocate.rafiq@example.com',
};
const DEMO_PASSWORD = 'demo-password-123';

interface RoleContextValue {
  role: UserRole;
  user: User | null;
  token: string | null;
  /** False while a stored session is being restored from the backend. */
  ready: boolean;
  setRole: (role: UserRole) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRoleState] = useState<UserRole>(() =>
    token ? ((localStorage.getItem(ROLE_KEY) as UserRole) || 'guest') : 'guest',
  );
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => !token);

  const login = useCallback((newUser: User, newToken: string) => {
    setUser(newUser);
    setRoleState(newUser.role);
    setToken(newToken);
    setReady(true);
    localStorage.setItem(ROLE_KEY, newUser.role);
    localStorage.setItem(TOKEN_KEY, newToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRoleState('guest');
    setToken(null);
    setReady(true);
    localStorage.setItem(ROLE_KEY, 'guest');
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  // A stored token means a previous session — restore the user from the backend.
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;
    getCurrentUser(storedToken)
      .then((freshUser) => login(freshUser, storedToken))
      .catch(logout);
  }, [login, logout]);

  // Any request rejected with 401 means the session expired.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  // Dev role switcher: sign in as that role's demo account.
  const setRole = (newRole: UserRole) => {
    const email = DEMO_ACCOUNTS[newRole];
    if (!email) {
      logout();
      return;
    }
    loginUser(email, DEMO_PASSWORD).then((res) => login(res.user, res.token)).catch(logout);
  };

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem(ROLE_KEY) as UserRole;
      if (stored && stored !== role) {
        setRoleState(stored);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [role]);

  return (
    <RoleContext.Provider value={{ role, user, token, ready, setRole, login, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
