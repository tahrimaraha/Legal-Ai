/**
 * Where the signed-in session lives.
 *
 * Each browser tab keeps its own copy (sessionStorage), so signing in as a different account in
 * another tab never swaps the account in this one. localStorage only holds the most recent login,
 * which a newly opened tab adopts so you stay signed in across tabs and restarts.
 */
const TOKEN_KEY = 'legal_ai_token';
const ROLE_KEY = 'legal_ai_role';
const USER_KEY = 'legal_ai_user_id';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getSessionToken(): string | null {
  return safe(() => {
    const mine = sessionStorage.getItem(TOKEN_KEY);
    if (mine) return mine;
    const shared = localStorage.getItem(TOKEN_KEY);
    if (shared) {
      sessionStorage.setItem(TOKEN_KEY, shared);
      sessionStorage.setItem(ROLE_KEY, localStorage.getItem(ROLE_KEY) || 'guest');
      sessionStorage.setItem(USER_KEY, localStorage.getItem(USER_KEY) || '');
    }
    return shared;
  }, null);
}

export function getSessionRole(): string | null {
  return safe(() => (getSessionToken() ? sessionStorage.getItem(ROLE_KEY) : null), null);
}

/** The account this tab is signed in as (used to renew its session). */
export function getSessionUserId(): string | null {
  return safe(() => (getSessionToken() ? sessionStorage.getItem(USER_KEY) || null : null), null);
}

export function saveSession(token: string, role: string, userId: string): void {
  safe(() => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
    sessionStorage.setItem(USER_KEY, userId);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(USER_KEY, userId);
  }, undefined);
}

/** After a silent session renewal: update this tab, and the shared copy only if it's the same account. */
export function replaceSessionToken(token: string): void {
  safe(() => {
    const mine = sessionStorage.getItem(USER_KEY);
    sessionStorage.setItem(TOKEN_KEY, token);
    if (mine && localStorage.getItem(USER_KEY) === mine) localStorage.setItem(TOKEN_KEY, token);
  }, undefined);
}

export function saveSessionRole(role: string): void {
  safe(() => {
    sessionStorage.setItem(ROLE_KEY, role);
    if (localStorage.getItem(TOKEN_KEY) === sessionStorage.getItem(TOKEN_KEY)) localStorage.setItem(ROLE_KEY, role);
  }, undefined);
}

export function clearSession(): void {
  safe(() => {
    const mine = sessionStorage.getItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(USER_KEY);
    // Only forget the shared login if it is this tab's account (don't sign out another tab's user).
    if (!mine || localStorage.getItem(TOKEN_KEY) === mine) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.setItem(ROLE_KEY, 'guest');
    }
  }, undefined);
}
