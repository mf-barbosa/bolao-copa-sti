import { useLocation, useNavigate } from 'react-router-dom';

import { getCurrentUser, logout } from '../auth/authService';

import '../styles/appHeader.css';

function AppHeader({ backLabel, onBack }) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getCurrentUser();

  const userName = user?.name || 'Jogador';
  const isAdmin = Boolean(user?.is_admin);

  function handleLogout() {
    logout();
    localStorage.removeItem('bolao_selected_pool');
    localStorage.removeItem('bolao_selected_group');

    navigate('/', { replace: true });
  }

  function handleNavigate(path) {
    navigate(path);
  }

  function isActive(path) {
    if (path === '/groups') {
      return location.pathname.startsWith('/groups');
    }

    return location.pathname === path;
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        {backLabel && onBack && (
          <button type="button" className="app-back-button" onClick={onBack}>
            ← {backLabel}
          </button>
        )}

        <span className="app-logo">⚽ BolãoCopa STI</span>
        <p>Copa do Mundo 2026</p>
      </div>

      <nav className="app-nav">
        <button
          type="button"
          className={isActive('/dashboard') ? 'active' : ''}
          onClick={() => handleNavigate('/dashboard')}
        >
          Início
        </button>

        <button
          type="button"
          className={isActive('/groups') ? 'active' : ''}
          onClick={() => handleNavigate('/groups')}
        >
          Grupos
        </button>

        <button
          type="button"
          className={isActive('/ranking') ? 'active' : ''}
          onClick={() => handleNavigate('/ranking')}
        >
          Ranking
        </button>

        <button
          type="button"
          className={isActive('/rules') ? 'active' : ''}
          onClick={() => handleNavigate('/rules')}
        >
          Regras
        </button>

        {isAdmin && (
          <button
            type="button"
            className={isActive('/admin') ? 'active' : ''}
            onClick={() => handleNavigate('/admin')}
          >
            Gerenciar
          </button>
        )}
      </nav>

      <div className="app-user-area">
        <div className="app-user">
          <span>Olá,</span>
          <strong>{userName}</strong>
        </div>

        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}

export default AppHeader;