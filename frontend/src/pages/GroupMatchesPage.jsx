import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import api from '../api/api';
import { getCurrentUser, logout } from '../auth/authService';

import '../styles/groupMatches.css';

function GroupMatchesPage() {
  const navigate = useNavigate();
  const { groupName } = useParams();

  const user = getCurrentUser();

  const [selectedPool, setSelectedPool] = useState(null);
  const [apiPool, setApiPool] = useState(null);
  const [matches, setMatches] = useState([]);

  const [predictionForms, setPredictionForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingPredictionId, setSavingPredictionId] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const userName = user?.name || 'Jogador';

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
      loadGroupMatches(parsedPool.id, groupName);
    } catch {
      localStorage.removeItem('bolao_selected_pool');
      setLoading(false);
      setError('Não foi possível carregar o bolão selecionado.');
    }
  }, [groupName]);

  const summary = useMemo(() => {
    const totalMatches = matches.length;
    const predictionsCount = matches.filter((match) => match.prediction).length;
    const missingPredictions = totalMatches - predictionsCount;
    const lockedMatches = matches.filter((match) => !match.can_predict).length;

    const percentage =
      totalMatches > 0 ? Math.round((predictionsCount / totalMatches) * 100) : 0;

    return {
      totalMatches,
      predictionsCount,
      missingPredictions,
      lockedMatches,
      percentage,
    };
  }, [matches]);

  async function loadGroupMatches(poolId, currentGroupName) {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await api.get(`/matches/group/${currentGroupName}`, {
        params: {
          pool_id: poolId,
        },
      });

      const apiMatches = response.data.matches || [];

      setApiPool(response.data.pool);
      setMatches(apiMatches);
      initializeForms(apiMatches);
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
          'Não foi possível carregar os jogos deste grupo.'
      );
    } finally {
      setLoading(false);
    }
  }

  function initializeForms(apiMatches) {
    const initialForms = {};

    apiMatches.forEach((match) => {
      initialForms[match.id] = {
        predicted_home_score:
          match.prediction?.predicted_home_score ?? '',
        predicted_away_score:
          match.prediction?.predicted_away_score ?? '',
      };
    });

    setPredictionForms(initialForms);
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

    loadGroupMatches(pool.id, groupName);
  }

  function handleScoreChange(matchId, field, value) {
    if (value !== '' && Number(value) < 0) return;

    setPredictionForms((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  }

  function validatePrediction(matchId) {
    const form = predictionForms[matchId];

    if (!form) {
      return 'Não foi possível encontrar o formulário deste jogo.';
    }

    if (
      form.predicted_home_score === '' ||
      form.predicted_away_score === ''
    ) {
      return 'Informe os dois placares antes de salvar.';
    }

    const homeScore = Number(form.predicted_home_score);
    const awayScore = Number(form.predicted_away_score);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      return 'Os placares precisam ser números inteiros.';
    }

    if (homeScore < 0 || awayScore < 0) {
      return 'Os placares não podem ser negativos.';
    }

    return null;
  }

  async function handleSavePrediction(match) {
    const validationError = validatePrediction(match.id);

    setMessage('');
    setError('');

    if (validationError) {
      setError(validationError);
      return;
    }

    const pool = apiPool || selectedPool;

    if (!pool?.id) {
      setError('Nenhum bolão selecionado.');
      return;
    }

    const form = predictionForms[match.id];

    const payload = {
      predicted_home_score: Number(form.predicted_home_score),
      predicted_away_score: Number(form.predicted_away_score),
    };

    try {
      setSavingPredictionId(match.id);

      if (match.prediction?.id) {
        await api.put(`/predictions/${match.prediction.id}`, payload);

        setMessage(
          `Palpite atualizado: ${match.home_team} ${payload.predicted_home_score} x ${payload.predicted_away_score} ${match.away_team}`
        );
      } else {
        await api.post('/predictions', {
          match_id: match.id,
          pool_id: pool.id,
          ...payload,
        });

        setMessage(
          `Palpite criado: ${match.home_team} ${payload.predicted_home_score} x ${payload.predicted_away_score} ${match.away_team}`
        );
      }

      await loadGroupMatches(pool.id, groupName);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível salvar o palpite deste jogo.'
      );
    } finally {
      setSavingPredictionId(null);
    }
  }

  function formatStatus(status) {
    const statusMap = {
      scheduled: 'Agendado',
      postponed: 'Adiado',
      live: 'Ao vivo',
      finished: 'Finalizado',
      cancelled: 'Cancelado',
    };

    return statusMap[status] || status;
  }

  function getStatusClass(status) {
    return `status-${status || 'unknown'}`;
  }

  function formatDate(matchDate) {
    if (!matchDate) return 'Data não definida';

    return matchDate;
  }

  const currentPool = apiPool || selectedPool;

  return (
    <div className="group-matches-page">
      <header className="group-matches-header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={handleBackToGroups}
          >
            ← Voltar aos grupos
          </button>

          <span className="group-matches-logo">⚽ BolãoCopa STI</span>
          <p>Copa do Mundo 2026</p>
        </div>

        <div className="group-matches-user-area">
          <div className="group-matches-user">
            <span>Olá,</span>
            <strong>{userName}</strong>
          </div>

          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="group-matches-main">
        <section className="group-matches-hero">
          <div>
            <p className="group-matches-tag">Palpites por grupo</p>

            <h1>Grupo {groupName}</h1>

            <p className="group-matches-description">
              Confira os jogos do grupo, veja se ainda é possível palpitar e
              salve seus placares dentro do bolão selecionado.
            </p>
          </div>

          <aside className="group-matches-summary-card">
            <span>🎯</span>

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
                <small>Progresso no grupo</small>
                <strong>{summary.percentage}%</strong>
              </div>

              <div className="summary-bar">
                <span style={{ width: `${summary.percentage}%` }} />
              </div>
            </div>
          </aside>
        </section>

        <section className="group-matches-stats">
          <article>
            <span>{summary.predictionsCount}</span>
            <p>Palpites feitos</p>
          </article>

          <article>
            <span>{summary.missingPredictions}</span>
            <p>Palpites faltando</p>
          </article>

          <article>
            <span>{summary.totalMatches}</span>
            <p>Jogos no grupo</p>
          </article>

          <article>
            <span>{summary.lockedMatches}</span>
            <p>Jogos bloqueados</p>
          </article>
        </section>

        {(message || error) && (
          <section className="group-matches-feedback">
            {message && <p className="group-matches-message">{message}</p>}
            {error && <p className="group-matches-error">{error}</p>}
          </section>
        )}

        <section className="group-matches-actions">
          <button type="button" onClick={handleBackToDashboard}>
            Trocar bolão
          </button>

          <button type="button" onClick={handleBackToGroups}>
            Ver todos os grupos
          </button>

          <button type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar jogos'}
          </button>
        </section>

        {loading && (
          <section className="group-matches-empty">
            <strong>Carregando jogos...</strong>
            <p>Aguarde enquanto buscamos os jogos e palpites na API.</p>
          </section>
        )}

        {!loading && matches.length === 0 && !error && (
          <section className="group-matches-empty">
            <strong>Nenhum jogo encontrado</strong>
            <p>Esse grupo ainda não possui jogos cadastrados.</p>
          </section>
        )}

        {!loading && matches.length > 0 && (
          <section className="matches-list">
            {matches.map((match) => {
              const form = predictionForms[match.id] || {
                predicted_home_score: '',
                predicted_away_score: '',
              };

              const hasPrediction = Boolean(match.prediction);
              const isSaving = savingPredictionId === match.id;
              const canEdit = Boolean(match.can_predict);

              return (
                <article key={match.id} className="match-card">
                  <div className="match-card-top">
                    <div>
                      <span>Jogo #{match.id}</span>
                      <strong>{formatDate(match.match_date)}</strong>
                    </div>

                    <small className={getStatusClass(match.status)}>
                      {formatStatus(match.status)}
                    </small>
                  </div>

                  <div className="match-teams">
                    <div className="team-box">
                      <span>Mandante</span>
                      <strong>{match.home_team}</strong>
                    </div>

                    <div className="versus-box">x</div>

                    <div className="team-box right">
                      <span>Visitante</span>
                      <strong>{match.away_team}</strong>
                    </div>
                  </div>

                  {match.status === 'finished' && (
                    <div className="official-result">
                      <span>Resultado oficial</span>
                      <strong>
                        {match.home_score} x {match.away_score}
                      </strong>
                    </div>
                  )}

                  <div className="prediction-area">
                    <div className="prediction-header">
                      <div>
                        <h2>
                          {hasPrediction
                            ? 'Seu palpite'
                            : 'Fazer palpite'}
                        </h2>

                        <p>
                          {hasPrediction
                            ? `Pontuação atual: ${match.prediction.points ?? 0} pontos`
                            : 'Informe o placar que você acredita para este jogo.'}
                        </p>
                      </div>

                      {hasPrediction && <span className="prediction-badge">Salvo</span>}
                    </div>

                    <div className="score-form">
                      <label>
                        <span>{match.home_team}</span>
                        <input
                          type="number"
                          min="0"
                          value={form.predicted_home_score}
                          disabled={!canEdit || isSaving}
                          onChange={(event) =>
                            handleScoreChange(
                              match.id,
                              'predicted_home_score',
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <strong>x</strong>

                      <label>
                        <span>{match.away_team}</span>
                        <input
                          type="number"
                          min="0"
                          value={form.predicted_away_score}
                          disabled={!canEdit || isSaving}
                          onChange={(event) =>
                            handleScoreChange(
                              match.id,
                              'predicted_away_score',
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>

                    {!canEdit && (
                      <p className="locked-message">
                        {match.prediction_locked_reason ||
                          'Palpite bloqueado para este jogo.'}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!canEdit || isSaving}
                      onClick={() => handleSavePrediction(match)}
                    >
                      {isSaving
                        ? 'Salvando...'
                        : hasPrediction
                          ? 'Atualizar palpite'
                          : 'Salvar palpite'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default GroupMatchesPage;