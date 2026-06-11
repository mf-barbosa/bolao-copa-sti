import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import GroupMatchesPage from './pages/GroupMatchesPage';
import RankingPage from './pages/RankingPage';
import RulesPage from './pages/RulesPage';
import AdminPage from './pages/AdminPage';

import {
  getToken,
  isSessionExpired,
  logout,
  updateSessionActivity,
} from './auth/authService';

const ACTIVITY_EVENTS = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleExpiredSession() {
      if (!getToken()) {
        return;
      }

      if (isSessionExpired()) {
        logout();
        navigate('/', { replace: true });
      }
    }

    let lastActivityWrite = 0;

    function handleUserActivity() {
      if (!getToken()) {
        return;
      }

      if (isSessionExpired()) {
        logout();
        navigate('/', { replace: true });
        return;
      }

      const now = Date.now();

      if (now - lastActivityWrite < 10000) {
        return;
      }

      lastActivityWrite = now;
      updateSessionActivity();
    }

    if (getToken()) {
      if (isSessionExpired()) {
        logout();
        navigate('/', { replace: true });
      } else {
        updateSessionActivity();
      }
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, {
        passive: true,
      });
    });

    const sessionInterval = window.setInterval(handleExpiredSession, 10000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });

      window.clearInterval(sessionInterval);
    };
  }, [navigate, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <GroupsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/groups/:groupName"
        element={
          <ProtectedRoute>
            <GroupMatchesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ranking"
        element={
          <ProtectedRoute>
            <RankingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rules"
        element={
          <ProtectedRoute>
            <RulesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;