import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import { logout } from '../auth/authService';
import AppHeader from '../components/AppHeader';
import TeamFlag from '../components/TeamFlag';
import { getTeamsByGroup } from '../data/worldCupGroups';

import '../styles/groups.css';

const GROUP_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function GroupsPage() {
  const navigate = useNavigate();

  const [selectedPool, setSelectedPool] = useState(null);
  const [apiPool, setApiPool] = useState(null);
  const [progress, setProgress] = useState([]);
  const [matches, setMatches] = useState([]);
  const [viewMode, setViewMode] = useState('groups');

  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedPool = localStorage.getItem('bolao_selected_pool');

    loadMatches();

    if (!storedPool) {
      setLoading(false);
      setError('Nenhum bolão selecionado. Volte e selecione um bolão.');
      return;
    }

    try {
      const parsedPool = JSON.parse(storedPool);

      setSelectedPool(parsedPool);
      loadGroupsProgress(parsedPool.id);
    } catch {
      localStorage.removeItem('bolao_selected_pool');
      setLoading(false);
      setError('Não foi possível carregar o bolão selecionado.');
    }
  }, []);

  const sortedProgress = useMemo(() => {
    return [...progress].sort((a, b) => {
      const indexA = GROUP_ORDER.indexOf(a.group_name);
      const indexB = GROUP_ORDER.indexOf(b.group_name);

      if (indexA === -1 && indexB === -1) {
        return a.group_name.localeCompare(b.group_name);
      }

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [progress]);

  const chronologicalMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const dateA = parseMatchDate(a.match_date)?.getTime() || 0;
      const dateB = parseMatchDate(b.match_date)?.getTime() || 0;

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return Number(a.match_number || a.id) - Number(b.match_number || b.id);
    });
  }, [matches]);

  const summary = useMemo(() => {
    const totalMatches = progress.reduce(
      (total, group) => total + Number(group.matches_count || 0),
      0
    );

    const totalPredictions = progress.reduce(
      (total, group) => total + Number(group.predictions_count || 0),
      0
    );

    const completedGroups = progress.filter((group) => group.completed).length;

    const percentage =
      totalMatches > 0 ? Math.round((totalPredictions / totalMatches) * 100) : 0;

    return {
      totalMatches,
      totalPredictions,
      completedGroups,
      percentage,
    };
  }, [progress]);

  async function loadGroupsProgress(poolId) {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await api.get('/matches/groups/progress', {
        params: {
          pool_id: poolId,
        },
      });

      setApiPool(response.data.pool);
      setProgress(response.data.progress || []);
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
          'Não foi possível carregar o progresso dos grupos.'
      );
    } finally {
      setLoading(false);
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

  function getStatusClass(status) {
    return `schedule-status status-${status || 'unknown'}`;
  }

  function handleBackToDashboard() {
    navigate('/dashboard');
  }

  function handleRefresh() {
    const pool = apiPool || selectedPool;

    loadMatches();

    if (!pool?.id) {
      setError('Nenhum bolão selecionado para atualizar.');
      return;
    }

    loadGroupsProgress(pool.id);
  }

  function handleOpenGroup(groupName) {
    localStorage.setItem('bolao_selected_group', groupName);
    navigate(`/groups/${groupName}`);
  }

  function handleOpenMatch(match) {
    localStorage.setItem('bolao_selected_group', match.group_name);
    navigate(`/groups/${match.group_name}?match_id=${match.id}`);
  }

  function handleOpenRanking() {
    const pool = apiPool || selectedPool;

    if (!pool?.id) {
      setError('Selecione um bolão antes de abrir o ranking.');
      return;
    }

    navigate('/ranking');
  }

  function handleOpenRules() {
    navigate('/rules');
  }

  function handleToggleViewMode() {
    setViewMode((currentMode) =>
      currentMode === 'groups' ? 'schedule' : 'groups'
    );
  }

  function getGroupStatus(group) {
    if (group.live_count > 0) return 'Ao vivo';
    if (group.completed) return 'Completo';
    if (group.finished_count > 0) return 'Em andamento';
    return 'Pendente';
  }

  function getGroupPercentage(group) {
    const matchesCount = Number(group.matches_count || 0);
    const predictionsCount = Number(group.predictions_count || 0);

    if (matchesCount === 0) return 0;

    return Math.round((predictionsCount / matchesCount) * 100);
  }

  const currentPool = apiPool || selectedPool;

  return (
    <div className="groups-page">
      <AppHeader backLabel="Voltar" onBack={handleBackToDashboard} />

      <main className="groups-main">
        <section className="groups-hero">
          <div>
            <h1>Escolha um grupo para fazer seus palpites</h1>

            <p className="groups-description">
              Acompanhe seu progresso por grupo e veja rapidamente quantos
              palpites ainda faltam dentro do bolão selecionado.
            </p>
          </div>

          <aside className="groups-summary-card">
            <span>🏆</span>

            <strong>
              {currentPool ? currentPool.name : 'Bolão não selecionado'}
            </strong>

            <p>
              {currentPool
                ? `Código: ${currentPool.code} • ID: ${currentPool.id}`
                : 'Volte para selecionar um bolão antes de continuar.'}
            </p>

            <div className="summary-progress">
              <div>
                <small>Progresso geral</small>
                <strong>{summary.percentage}%</strong>
              </div>

              <div className="summary-bar">
                <span style={{ width: `${summary.percentage}%` }} />
              </div>
            </div>
          </aside>
        </section>

        <section className="groups-stats">
          <article>
            <span>{summary.totalPredictions}</span>
            <p>Palpites feitos</p>
          </article>

          <article>
            <span>{summary.totalMatches}</span>
            <p>Jogos no total</p>
          </article>

          <article>
            <span>{summary.completedGroups}</span>
            <p>Grupos completos</p>
          </article>

          <article>
            <span>{sortedProgress.length}</span>
            <p>Grupos carregados</p>
          </article>
        </section>

        {(message || error) && (
          <section className="groups-feedback">
            {message && <p className="groups-message">{message}</p>}
            {error && <p className="groups-error">{error}</p>}
          </section>
        )}

        <section className="groups-actions">
          <button type="button" onClick={handleBackToDashboard}>
            Trocar bolão
          </button>

          <button type="button" onClick={handleToggleViewMode}>
            {viewMode === 'groups' ? 'Ver jogos por data' : 'Ver cards dos grupos'}
          </button>

          <button type="button" onClick={handleOpenRanking}>
            Ver ranking
          </button>

          <button type="button" onClick={handleOpenRules}>
            Ver regras
          </button>

          <button type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar progresso'}
          </button>
        </section>

        {loading && (
          <section className="groups-empty">
            <strong>Carregando grupos...</strong>
            <p>Aguarde enquanto buscamos o progresso na API.</p>
          </section>
        )}

        {!loading && viewMode === 'groups' && sortedProgress.length === 0 && !error && (
          <section className="groups-empty">
            <strong>Nenhum grupo encontrado</strong>
            <p>
              Ainda não há jogos cadastrados para exibir progresso de grupos.
            </p>
          </section>
        )}

        {!loading && viewMode === 'groups' && sortedProgress.length > 0 && (
          <section className="groups-grid">
            {sortedProgress.map((group) => {
              const percentage = getGroupPercentage(group);
              const status = getGroupStatus(group);
              const groupTeams = getTeamsByGroup(group.group_name);

              return (
                <article
                  key={group.group_name}
                  className={`group-card ${group.completed ? 'completed' : ''}`}
                >
                  <div className="group-card-header">
                    <div>
                      <span>Grupo</span>
                      <strong>{group.group_name}</strong>
                    </div>

                    <small>{status}</small>
                  </div>

                  {groupTeams.length > 0 && (
                    <div
                      className="group-flags-row"
                      aria-label={`Bandeiras do Grupo ${group.group_name}`}
                    >
                      {groupTeams.map((team) => (
                        <div className="group-flag-item" key={team}>
                          <TeamFlag teamName={team} size="md" />
                          <span>{team}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="group-progress-info">
                    <strong>
                      {group.predictions_count}/{group.matches_count}
                    </strong>

                    <span>palpites feitos</span>
                  </div>

                  <div className="group-progress-bar">
                    <span style={{ width: `${percentage}%` }} />
                  </div>

                  <div className="group-details">
                    <div>
                      <span>Faltam</span>
                      <strong>{group.missing_predictions_count}</strong>
                    </div>

                    <div>
                      <span>Finalizados</span>
                      <strong>{group.finished_count}</strong>
                    </div>

                    <div>
                      <span>Ao vivo</span>
                      <strong>{group.live_count}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenGroup(group.group_name)}
                  >
                    Abrir grupo
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {!loading && viewMode === 'schedule' && (
          <section className="schedule-section">
            <div className="schedule-header">
              <div>
                <h2>Jogos em ordem cronológica</h2>
                <p>
                  Veja a sequência completa das partidas organizadas por data e
                  horário.
                </p>
              </div>

              <span>{chronologicalMatches.length} jogos</span>
            </div>

            {loadingMatches && (
              <section className="groups-empty">
                <strong>Carregando jogos...</strong>
                <p>Aguarde enquanto buscamos a tabela da Copa.</p>
              </section>
            )}

            {!loadingMatches && chronologicalMatches.length === 0 && (
              <section className="groups-empty">
                <strong>Nenhum jogo encontrado</strong>
                <p>A tabela da Copa ainda não possui jogos cadastrados.</p>
              </section>
            )}

            {!loadingMatches && chronologicalMatches.length > 0 && (
              <div className="schedule-list">
                {chronologicalMatches.map((match) => (
                  <article className="schedule-match-card" key={match.id}>
                    <div className="schedule-match-top">
                      <div>
                        <span>
                          Grupo {match.group_name} • Jogo #{match.match_number || match.id}
                        </span>

                        <strong>{formatMatchDate(match.match_date)}</strong>
                      </div>

                      <small className={getStatusClass(match.status)}>
                        {formatStatus(match.status)}
                      </small>
                    </div>

                    <div className="schedule-match-teams">
                      <div className="schedule-team">
                        <TeamFlag teamName={match.home_team} size="md" />
                        <strong>{match.home_team}</strong>
                      </div>

                      <span className="schedule-versus">x</span>

                      <div className="schedule-team right">
                        <strong>{match.away_team}</strong>
                        <TeamFlag teamName={match.away_team} size="md" />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="schedule-prediction-button"
                      onClick={() => handleOpenMatch(match)}
                    >
                      Editar palpite
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default GroupsPage;