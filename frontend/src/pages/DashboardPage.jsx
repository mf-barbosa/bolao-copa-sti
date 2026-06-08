import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import { getCurrentUser } from '../auth/authService';
import AppHeader from '../components/AppHeader';
import TeamFlag from '../components/TeamFlag';

import '../styles/dashboard.css';

function DashboardPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();

  const [poolCode, setPoolCode] = useState('');
  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [matches, setMatches] = useState([]);

  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [joiningPool, setJoiningPool] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    loadMatches();
  }, []);

  const nextMatch = useMemo(() => {
    const now = new Date();

    return [...matches]
      .filter((match) => {
        const status = match.status || 'scheduled';

        if (status === 'finished' || status === 'cancelled') {
          return false;
        }

        const matchDate = parseMatchDate(match.match_date);

        if (!matchDate) {
          return false;
        }

        return matchDate >= now;
      })
      .sort((a, b) => {
        const dateA = parseMatchDate(a.match_date)?.getTime() || 0;
        const dateB = parseMatchDate(b.match_date)?.getTime() || 0;

        return dateA - dateB;
      })[0] || null;
  }, [matches]);

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

  async function loadMatches() {
    try {
      setLoadingMatches(true);

      const response = await api.get('/matches');

      setMatches(response.data || []);
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }

  function parseMatchDate(matchDate) {
    if (!matchDate) {
      return null;
    }

    const parsedDate = new Date(String(matchDate).replace(' ', 'T'));

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function formatMatchDate(matchDate) {
    const parsedDate = parseMatchDate(matchDate);

    if (!parsedDate) {
      return 'Data não definida';
    }

    return parsedDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatStatus(status) {
    const statusMap = {
      scheduled: 'Agendado',
      postponed: 'Adiado',
      live: 'Ao vivo',
      finished: 'Finalizado',
      cancelled: 'Cancelado',
    };

    return statusMap[status] || status || 'Agendado';
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
      <AppHeader />

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
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

          <article className="dashboard-card next-match-card">
            <div className="card-header">
              <span>⚽</span>
              <div>
                <h2>Próximo jogo</h2>
                <p>Lembrete da próxima partida da Copa.</p>
              </div>
            </div>

            {loadingMatches && (
              <div className="empty-state">
                <strong>Carregando próximo jogo...</strong>
                <p>Aguarde enquanto buscamos a tabela da Copa.</p>
              </div>
            )}

            {!loadingMatches && !nextMatch && (
              <div className="empty-state">
                <strong>Nenhum próximo jogo encontrado</strong>
                <p>Não há partidas futuras cadastradas no momento.</p>
              </div>
            )}

            {!loadingMatches && nextMatch && (
              <div className="next-match-box">
                <div className="next-match-teams">
                  <div className="next-match-team">
                    <TeamFlag teamName={nextMatch.home_team} size="lg" />
                    <strong>{nextMatch.home_team}</strong>
                  </div>

                  <span className="next-match-versus">x</span>

                  <div className="next-match-team right">
                    <strong>{nextMatch.away_team}</strong>
                    <TeamFlag teamName={nextMatch.away_team} size="lg" />
                  </div>
                </div>

                <div className="next-match-info">
                  <div>
                    <span>Grupo</span>
                    <strong>{nextMatch.group_name}</strong>
                  </div>

                  <div>
                    <span>Jogo</span>
                    <strong>
                      #{nextMatch.match_number || nextMatch.id}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>{formatStatus(nextMatch.status)}</strong>
                  </div>
                </div>

                <div className="next-match-date">
                  <span>Data e horário</span>
                  <strong>{formatMatchDate(nextMatch.match_date)}</strong>
                </div>
              </div>
            )}
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