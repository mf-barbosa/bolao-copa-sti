import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import { getCurrentUser, logout } from '../auth/authService';

import '../styles/ranking.css';

function RankingPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();

  const [selectedPool, setSelectedPool] = useState(null);
  const [apiPool, setApiPool] = useState(null);
  const [ranking, setRanking] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userName = user?.name || 'Jogador';
  const userId = Number(user?.id);

  useEffect(() => {
    const storedPool = localStorage.getItem('bolao_selected_pool');

    if (!storedPool) {
      setLoading(false);
      setError('Nenhum bolão selecionado. Volte e selecione um bolão.');
      return;
    }

    try {
      const parsedPool = JSON.parse(storedPool);

      setSelectedPool(parsedPool);
      loadRanking(parsedPool.id);
    } catch {
      localStorage.removeItem('bolao_selected_pool');
      setLoading(false);
      setError('Não foi possível carregar o bolão selecionado.');
    }
  }, []);

  const orderedRanking = useMemo(() => {
    return [...ranking].sort((a, b) => {
      const pointsA = Number(a.total_points || 0);
      const pointsB = Number(b.total_points || 0);

      if (pointsB !== pointsA) {
        return pointsB - pointsA;
      }

      return String(a.name).localeCompare(String(b.name));
    });
  }, [ranking]);

  const currentUserPosition = useMemo(() => {
    const index = orderedRanking.findIndex(
      (participant) => Number(participant.id) === userId
    );

    if (index === -1) {
      return null;
    }

    return index + 1;
  }, [orderedRanking, userId]);

  const leader = orderedRanking[0] || null;
  const currentPool = apiPool || selectedPool;

  async function loadRanking(poolId) {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/ranking/${poolId}`);

      setApiPool(response.data.pool);
      setRanking(response.data.ranking || []);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        localStorage.removeItem('bolao_selected_pool');
        localStorage.removeItem('bolao_selected_group');
        navigate('/', { replace: true });
        return;
      }

      setError(
        err.response?.data?.error ||
          'Não foi possível carregar o ranking deste bolão.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBackToGroups() {
    navigate('/groups');
  }

  function handleBackToDashboard() {
    navigate('/dashboard');
  }

  function handleLogout() {
    logout();
    localStorage.removeItem('bolao_selected_pool');
    localStorage.removeItem('bolao_selected_group');
    navigate('/', { replace: true });
  }

  function handleRefresh() {
    const pool = apiPool || selectedPool;

    if (!pool?.id) {
      setError('Nenhum bolão selecionado para atualizar.');
      return;
    }

    loadRanking(pool.id);
  }

  function getMedal(position) {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';

    return `#${position}`;
  }

  function getPositionClass(position, participantId) {
    const classes = ['ranking-row'];

    if (position === 1) classes.push('first-place');
    if (position === 2) classes.push('second-place');
    if (position === 3) classes.push('third-place');
    if (Number(participantId) === userId) classes.push('current-user');

    return classes.join(' ');
  }

  return (
    <div className="ranking-page">
      <header className="ranking-header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={handleBackToGroups}
          >
            ← Voltar aos grupos
          </button>

          <span className="ranking-logo">⚽ BolãoCopa STI</span>
          <p>Copa do Mundo 2026</p>
        </div>

        <div className="ranking-user-area">
          <div className="ranking-user">
            <span>Olá,</span>
            <strong>{userName}</strong>
          </div>

          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="ranking-main">
        <section className="ranking-hero">
          <div>
            <p className="ranking-tag">Ranking do bolão</p>

            <h1>Classificação geral</h1>

            <p className="ranking-description">
              Veja quem está liderando a disputa, acompanhe sua posição e
              compare a pontuação total dos participantes do bolão selecionado.
            </p>
          </div>

          <aside className="ranking-summary-card">
            <span>🏆</span>

            <strong>
              {currentPool ? currentPool.name : 'Bolão não selecionado'}
            </strong>

            <p>
              {currentPool
                ? `Código: ${currentPool.code} • ID: ${currentPool.id}`
                : 'Volte para selecionar um bolão antes de continuar.'}
            </p>

            <div className="ranking-summary-grid">
              <div>
                <small>Participantes</small>
                <strong>{orderedRanking.length}</strong>
              </div>

              <div>
                <small>Sua posição</small>
                <strong>
                  {currentUserPosition ? `#${currentUserPosition}` : '-'}
                </strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="ranking-actions">
          <button type="button" onClick={handleBackToDashboard}>
            Trocar bolão
          </button>

          <button type="button" onClick={handleBackToGroups}>
            Ver grupos
          </button>

          <button type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar ranking'}
          </button>
        </section>

        {error && (
          <section className="ranking-feedback">
            <p className="ranking-error">{error}</p>
          </section>
        )}

        {loading && (
          <section className="ranking-empty">
            <strong>Carregando ranking...</strong>
            <p>Aguarde enquanto buscamos a classificação na API.</p>
          </section>
        )}

        {!loading && !error && orderedRanking.length === 0 && (
          <section className="ranking-empty">
            <strong>Nenhum participante encontrado</strong>
            <p>
              Ainda não há dados suficientes para montar o ranking deste bolão.
            </p>
          </section>
        )}

        {!loading && !error && orderedRanking.length > 0 && (
          <>
            <section className="ranking-podium">
              <article className="podium-card leader-card">
                <span>🥇</span>
                <small>Líder do bolão</small>
                <strong>{leader.name}</strong>
                <p>{leader.total_points || 0} pontos</p>
              </article>

              <article className="podium-card">
                <span>🎯</span>
                <small>Você</small>
                <strong>{userName}</strong>
                <p>
                  {currentUserPosition
                    ? `Posição #${currentUserPosition}`
                    : 'Ainda sem posição'}
                </p>
              </article>

              <article className="podium-card">
                <span>⚽</span>
                <small>Total</small>
                <strong>{orderedRanking.length}</strong>
                <p>participantes</p>
              </article>
            </section>

            <section className="ranking-table-card">
              <div className="ranking-table-header">
                <h2>Participantes</h2>
                <p>Ranking ordenado por pontuação total.</p>
              </div>

              <div className="ranking-list">
                {orderedRanking.map((participant, index) => {
                  const position = index + 1;
                  const isCurrentUser = Number(participant.id) === userId;

                  return (
                    <article
                      key={participant.id}
                      className={getPositionClass(position, participant.id)}
                    >
                      <div className="ranking-position">
                        {getMedal(position)}
                      </div>

                      <div className="ranking-participant">
                        <strong>{participant.name}</strong>
                        <span>
                          {participant.username}
                          {isCurrentUser ? ' • você' : ''}
                        </span>
                      </div>

                      <div className="ranking-points">
                        <strong>{participant.total_points || 0}</strong>
                        <span>pontos</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default RankingPage;