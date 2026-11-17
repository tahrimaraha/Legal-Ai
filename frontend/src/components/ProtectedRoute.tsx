import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import type { UserRole } from '../mocks/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = '/signin' }: ProtectedRouteProps) {
  const { role, user, loading } = useRole();
  const location = useLocation();

  // A stored session is still being checked against the backend — don't redirect yet.
  if (loading) {
    return null;
  }

  // If user is not logged in (guest), redirect to sign-in
  if (role === 'guest' || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
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

  // If user is a lawyer trying to access the lawyer portal, check approval status
  if (role === 'lawyer' && allowedRoles.includes('lawyer')) {
    const approvalStatus = user.approvalStatus;
    // Only allow access if approved
    if (approvalStatus !== 'approved') {
      return <Navigate to="/signup/lawyer/pending" replace />;
    }
  }

  // User has correct role and is approved (if applicable), render the protected content
  return <>{children}</>;
}
