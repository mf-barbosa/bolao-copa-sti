import { Navigate } from 'react-router-dom';

import { getCurrentUser, isAuthenticated } from '../auth/authService';

function AdminRoute({ children }) {
  const user = getCurrentUser();

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (!user || Number(user.is_admin) !== 1) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;