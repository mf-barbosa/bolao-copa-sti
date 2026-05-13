import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import { getCurrentUser, logout } from '../auth/authService';

import '../styles/dashboard.css';

function DashboardPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();

  const [poolCode, setPoolCode] = useState('');
  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);

  const [loadingPools, setLoadingPools] = useState(true);
  const [joiningPool, setJoiningPool] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const userName = user?.name || 'Jogador';
  const isAdmin = Boolean(user?.is_admin);

  useEffect(() => {
    const storedPool = localStorage.getItem('bolao_selected_pool');

    if (storedPool) {
      try {
        setSelectedPool(JSON.parse(storedPool));
      } catch {
        localStorage.removeItem('bolao_selected_pool');
      }
    }

    loadMyPools();
  }, []);

  async function loadMyPools() {
    try {
      setLoadingPools(true);
      setError('');

      const response = await api.get('/pools/me');

      setPools(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível carregar seus bolões. Verifique se o backend está rodando.'
      );
    } finally {
      setLoadingPools(false);
    }
  }

  function handleLogout() {
    logout();
    localStorage.removeItem('bolao_selected_pool');
    localStorage.removeItem('bolao_selected_group');
    navigate('/', { replace: true });
  }

  function handleSelectPool(pool) {
    setSelectedPool(pool);
    localStorage.setItem('bolao_selected_pool', JSON.stringify(pool));

    setMessage(`Bolão "${pool.name}" selecionado com sucesso.`);
    setError('');
  }

  async function handleJoinPool(event) {
    event.preventDefault();

    const formattedCode = poolCode.trim().toUpperCase();

    setMessage('');
    setError('');

    if (!formattedCode) {
      setError('Digite o código do bolão para continuar.');
      return;
    }

    try {
      setJoiningPool(true);

      const response = await api.post('/pools/join', {
        code: formattedCode,
      });

      const joinedPool = response.data.pool;

      setPoolCode('');
      setMessage(response.data.message || 'Você entrou no bolão com sucesso.');

      handleSelectPool(joinedPool);
      await loadMyPools();
    } catch (err) {
      const apiError = err.response?.data;

      if (apiError?.poolId) {
        setError(
          'Você já participa deste bolão. Selecione ele na lista de seus bolões.'
        );

        await loadMyPools();
        return;
      }

      setError(apiError?.error || 'Não foi possível entrar no bolão.');
    } finally {
      setJoiningPool(false);
    }
  }

  function handleGoToPool() {
    const storedPool = localStorage.getItem('bolao_selected_pool');

    if (!selectedPool && !storedPool) {
      setError('Selecione um bolão antes de continuar.');
      return;
    }

    navigate('/groups');
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-logo">⚽ BolãoCopa STI</span>
          <p>Copa do Mundo 2026</p>
        </div>

        <div className="dashboard-user-area">
          <div className="dashboard-user">
            <span>Olá,</span>
            <strong>{userName}</strong>
          </div>

          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-tag">Frontend MVP</p>

            <h1>Escolha seu bolão e entre na disputa</h1>

            <p className="dashboard-description">
              Use um código para entrar em um bolão ou selecione um bolão em que
              você já participa. Depois disso, vamos liberar os grupos, jogos,
              palpites e ranking.
            </p>
          </div>

          <div className="dashboard-hero-card">
            <span>🏆</span>
            <strong>
              {selectedPool
                ? `Bolão selecionado: ${selectedPool.name}`
                : 'Nenhum bolão selecionado'}
            </strong>

            <p>
              {selectedPool
                ? `Código: ${selectedPool.code} • ID: ${selectedPool.id}`
                : 'Selecione ou entre em um bolão para continuar o fluxo principal do sistema.'}
            </p>

            <button type="button" onClick={handleGoToPool}>
              Continuar para os grupos
            </button>
          </div>
        </section>

        {(message || error) && (
          <section className="feedback-area">
            {message && <p className="dashboard-message">{message}</p>}
            {error && <p className="dashboard-error">{error}</p>}
          </section>
        )}

        <section className="dashboard-grid">
          <article className="dashboard-card join-card">
            <div className="card-header">
              <span>🔑</span>
              <div>
                <h2>Entrar em um bolão</h2>
                <p>Informe o código enviado pelo administrador.</p>
              </div>
            </div>

            <form onSubmit={handleJoinPool} className="join-form">
              <label htmlFor="poolCode">Código do bolão</label>

              <input
                id="poolCode"
                type="text"
                placeholder="Ex: STI2026"
                value={poolCode}
                onChange={(event) => setPoolCode(event.target.value)}
              />

              <button type="submit" disabled={joiningPool}>
                {joiningPool ? 'Entrando...' : 'Entrar no bolão'}
              </button>
            </form>
          </article>

          <article className="dashboard-card my-pools-card">
            <div className="card-header">
              <span>📋</span>
              <div>
                <h2>Meus bolões</h2>
                <p>Selecione o bolão que deseja acessar.</p>
              </div>
            </div>

            {loadingPools && (
              <div className="empty-state">
                <strong>Carregando seus bolões...</strong>
                <p>Aguarde enquanto buscamos seus dados na API.</p>
              </div>
            )}

            {!loadingPools && pools.length === 0 && (
              <div className="empty-state">
                <strong>Você ainda não participa de nenhum bolão</strong>
                <p>Use o campo de código para entrar no primeiro bolão.</p>
              </div>
            )}

            {!loadingPools && pools.length > 0 && (
              <div className="pools-list">
                {pools.map((pool) => {
                  const isSelected = selectedPool?.id === pool.id;

                  return (
                    <button
                      type="button"
                      key={pool.id}
                      className={`pool-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPool(pool)}
                    >
                      <div>
                        <strong>{pool.name}</strong>
                        <span>{pool.code}</span>
                      </div>

                      {isSelected ? (
                        <small>Selecionado</small>
                      ) : (
                        <small>Selecionar</small>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <article className="dashboard-card">
            <div className="card-header">
              <span>⚽</span>
              <div>
                <h2>Próximos jogos</h2>
                <p>Atalho para os grupos da Copa.</p>
              </div>
            </div>

            <div className="preview-list">
              <div>
                <span>Bolão ativo</span>
                <strong>{selectedPool ? selectedPool.name : 'Não selecionado'}</strong>
              </div>

              <div>
                <span>Próxima tela</span>
                <strong>Grupos</strong>
              </div>
            </div>
          </article>

          <article className="dashboard-card">
            <div className="card-header">
              <span>{isAdmin ? '🛠️' : '👤'}</span>
              <div>
                <h2>{isAdmin ? 'Painel admin' : 'Minha conta'}</h2>
                <p>
                  {isAdmin
                    ? 'Você tem permissão administrativa.'
                    : 'Conta comum de participante.'}
                </p>
              </div>
            </div>

            <div className="account-box">
              <span>Tipo de usuário</span>
              <strong>{isAdmin ? 'Administrador' : 'Participante'}</strong>
            </div>

            {isAdmin && (
              <div className="admin-hint">
                <strong>Admin disponível</strong>
                <p>
                  O painel administrativo será conectado em uma etapa própria do
                  frontend.
                </p>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;