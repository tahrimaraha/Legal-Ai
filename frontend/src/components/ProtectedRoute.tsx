import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import type { UserRole } from '../mocks/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = '/signin' }: ProtectedRouteProps) {
  const { role, user, ready } = useRole();
  const location = useLocation();

  // Still restoring a stored session — don't bounce to sign-in yet.
  if (!ready) return null;

  // If user is not logged in (guest), redirect to sign-in
  if (role === 'guest' || !user) {
    // Carry the full target (e.g. a meeting invite link) through sign-in.
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={`${redirectTo}?redirect=${encodeURIComponent(target)}`} state={{ from: location }} replace />;
  }

  // If user's role is not in allowed roles, redirect to their own dashboard
  if (!allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on their actual role
    const dashboardMap: Record<UserRole, string> = {
      citizen: '/app',
      lawyer: '/lawyer',
      admin: '/admin',
      guest: '/signin',
    };
    
    return <Navigate to={dashboardMap[role]} replace />;
  }

  // Lawyers can't use the portal until an admin approves their credentials.
  if (role === 'lawyer' && user.lawyerStatus !== 'approved') {
    return <Navigate to="/signup/lawyer/pending" replace />;
  }

  // User has correct role, render the protected content
  return <>{children}</>;
}
