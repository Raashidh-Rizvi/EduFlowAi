import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasSession } from '../../services/api';

export default function ProtectedRoute({ roles, children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (!hasSession() || !currentUser || !currentUser.isActive) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (!roles.includes(currentUser.role)) {
    return <main role="alert" style={{ padding: 32 }}>
      <h1>Access Restricted</h1>
      <p>Your account does not have permission to open this workspace.</p>
      <Link to="/console">Return to your workspace</Link>
    </main>;
  }
  return children;
}
