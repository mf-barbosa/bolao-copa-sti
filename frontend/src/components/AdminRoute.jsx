import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import api from '../api/api';
import {
  getCurrentUser,
  isAuthenticated,
  logout,
  saveCurrentUser,
} from '../auth/authService';

function AdminRoute({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    async function checkAdminPermission() {
      if (!isAuthenticated()) {
        setStatus('unauthenticated');
        return;
      }

      const localUser = getCurrentUser();

      if (Number(localUser?.is_admin) === 1) {
        setStatus('authorized');
        return;
      }

      try {
        const response = await api.get('/users/me');
        const updatedUser = saveCurrentUser(response.data.user);

        if (Number(updatedUser?.is_admin) === 1) {
          setStatus('authorized');
          return;
        }

        setStatus('forbidden');
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
          setStatus('unauthenticated');
          return;
        }

        setStatus('forbidden');
      }
    }

    checkAdminPermission();
  }, []);

  if (status === 'checking') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0b0f1a',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Verificando permissões...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/" replace />;
  }

  if (status === 'forbidden') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;