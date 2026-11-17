import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, UserRole } from '../mocks/types';
import { getCurrentUser, logoutSession, SESSION_ENDED_EVENT } from '../lib/api';
import {
  clearSession,
  getSessionRole,
  getSessionToken,
  getSessionUserId,
  saveSession,
  saveSessionRole,
} from '../lib/session';

interface RoleContextValue {
  role: UserRole;
  user: User | null;
  token: string | null;
  /** True while a stored session token is being checked against the backend. */
  loading: boolean;
  setRole: (role: UserRole) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  // Without a session token the visitor is a guest; with one, the real user is fetched below.
  const [token, setToken] = useState<string | null>(() => getSessionToken());
  const [role, setRoleState] = useState<UserRole>(() => (getSessionRole() as UserRole) || 'guest');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!getSessionToken());

  // On first load, a stored token means a real session — fetch the current user from the backend.
  useEffect(() => {
    const storedToken = getSessionToken();
    if (!storedToken) return;
    getCurrentUser() // renews an expired access token from the session cookie if needed
      .then((freshUser) => {
        setUser(freshUser);
        setRoleState(freshUser.role);
        saveSessionRole(freshUser.role);
      })
      .catch(() => {
        clearSession();
        setToken(null);
        setRoleState('guest');
      })
      .finally(() => setLoading(false));
    // Runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    saveSessionRole(newRole);
    if (newRole === 'guest') {
      setUser(null);
    }
  };

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setRoleState(newUser.role);
    setToken(newToken);
    saveSession(newToken, newUser.role, newUser.id);
  };

  const signOutLocally = () => {
    setUser(null);
    setRoleState('guest');
    setToken(null);
    clearSession();
  };

  const logout = () => {
    void logoutSession(getSessionUserId()); // revoke the server session (cookie) too
    signOutLocally();
  };

  // The session could not be renewed (expired / revoked elsewhere): sign this tab out.
  useEffect(() => {
    const onEnded = () => signOutLocally();
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  // Note: no cross-tab syncing on purpose — each tab stays signed in as the account it started with.

  return (
    <RoleContext.Provider value={{ role, user, token, loading, setRole, login, logout }}>
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
