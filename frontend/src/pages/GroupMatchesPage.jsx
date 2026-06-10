import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import api from '../api/api';
import { logout } from '../auth/authService';
import AppHeader from '../components/AppHeader';
import TeamFlag from '../components/TeamFlag';

import '../styles/groupMatches.css';

function GroupMatchesPage() {
  const navigate = useNavigate();
  const { groupName } = useParams();
  const [searchParams] = useSearchParams();

  const selectedMatchId = searchParams.get('match_id');

  const [selectedPool, setSelectedPool] = useState(null);
  const [apiPool, setApiPool] = useState(null);
  const [matches, setMatches] = useState([]);

  const [predictionForms, setPredictionForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingGroupPredictions, setSavingGroupPredictions] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (loading || !selectedMatchId || matches.length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const selectedMatchElement = document.getElementById(
        `match-${selectedMatchId}`
      );

      if (selectedMatchElement) {
        selectedMatchElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        selectedMatchElement.focus({
          preventScroll: true,
        });
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [loading, matches, selectedMatchId]);

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

  const editableMatchesCount = useMemo(() => {
    return matches.filter((match) => match.can_predict).length;
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
        predicted_home_score: match.prediction?.predicted_home_score ?? '',
        predicted_away_score: match.prediction?.predicted_away_score ?? '',
      };
    });

    setPredictionForms(initialForms);
  }

  function normalizeScoreInput(value) {
    const onlyNumbers = String(value).replace(/\D/g, '');

    if (onlyNumbers.length > 2) {
      return null;
    }

    if (onlyNumbers !== '' && Number(onlyNumbers) > 99) {
      return null;
    }

    return onlyNumbers;
  }

  function handleBackToGroups() {
    navigate('/groups');
  }

  function handleBackToDashboard() {
    navigate('/dashboard');
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
    const normalizedValue = normalizeScoreInput(value);

    if (normalizedValue === null) {
      return;
    }

    setPredictionForms((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: normalizedValue,
      },
    }));
  }

  function validatePredictionScores(match, form) {
    if (!form) {
      return 'Não foi possível encontrar o formulário deste jogo.';
    }

    if (
      form.predicted_home_score === '' ||
      form.predicted_away_score === ''
    ) {
      return `Informe os dois placares para ${match.home_team} x ${match.away_team}.`;
    }

    const homeScore = Number(form.predicted_home_score);
    const awayScore = Number(form.predicted_away_score);

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      return `Os placares de ${match.home_team} x ${match.away_team} precisam ser números inteiros.`;
    }

    if (homeScore < 0 || awayScore < 0) {
      return `Os placares de ${match.home_team} x ${match.away_team} não podem ser negativos.`;
    }

    if (homeScore > 99 || awayScore > 99) {
      return `Os placares de ${match.home_team} x ${match.away_team} devem ser menores ou iguais a 99.`;
    }

    return null;
  }

  async function handleSaveGroupPredictions() {
    const pool = apiPool || selectedPool;

    setMessage('');
    setError('');

    if (!pool?.id) {
      setError('Nenhum bolão selecionado.');
      return;
    }

    const payloadPredictions = [];

    for (const match of matches) {
      if (!match.can_predict) {
        continue;
      }

      const form = predictionForms[match.id] || {};
      const homeScore = form.predicted_home_score;
      const awayScore = form.predicted_away_score;

      const bothEmpty = homeScore === '' && awayScore === '';

      if (bothEmpty) {
        continue;
      }

      const validationError = validatePredictionScores(match, form);

      if (validationError) {
        setError(validationError);
        return;
      }

      payloadPredictions.push({
        match_id: match.id,
        predicted_home_score: Number(homeScore),
        predicted_away_score: Number(awayScore),
      });
    }

    if (payloadPredictions.length === 0) {
      setError('Preencha pelo menos um palpite do grupo antes de salvar.');
      return;
    }

    try {
      setSavingGroupPredictions(true);

      const response = await api.post('/predictions/bulk', {
        pool_id: pool.id,
        predictions: payloadPredictions,
      });

      setMessage(
        response.data.message ||
          `${payloadPredictions.length} palpite(s) salvo(s) com sucesso.`
      );

      await loadGroupMatches(pool.id, groupName);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível salvar os palpites deste grupo.'
      );
    } finally {
      setSavingGroupPredictions(false);
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

  function formatDate(matchDate) {
    const parsedDate = parseMatchDate(matchDate);

    if (!parsedDate) {
      return 'Data não definida';
    }

    const date = parsedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const time = parsedDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${date} ${time}`;
  }

  const currentPool = apiPool || selectedPool;

  return (
    <div className="group-matches-page">
      <AppHeader backLabel="Voltar aos grupos" onBack={handleBackToGroups} />

      <main className="group-matches-main">
        <section className="group-matches-hero">
          <div>
            <h1>Grupo {groupName}</h1>

            <p className="group-matches-description">
              Confira os jogos do grupo, preencha seus placares e salve todos os
              palpites de uma vez pelo botão no final da página.
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
          <>
            <section className="matches-list">
              {matches.map((match) => {
                const form = predictionForms[match.id] || {
                  predicted_home_score: '',
                  predicted_away_score: '',
                };

                const hasPrediction = Boolean(match.prediction);
                const canEdit = Boolean(match.can_predict);
                const isSelectedMatch = String(match.id) === selectedMatchId;

                return (
                  <article
                    key={match.id}
                    id={`match-${match.id}`}
                    tabIndex={isSelectedMatch ? -1 : undefined}
                    className={`match-card ${
                      isSelectedMatch ? 'match-card-highlight' : ''
                    }`}
                  >
                    <div className="match-card-top">
                      <div>
                        <span>Jogo #{match.match_number || match.id}</span>
                        <strong>{formatDate(match.match_date)}</strong>
                      </div>

                      <small className={getStatusClass(match.status)}>
                        {formatStatus(match.status)}
                      </small>
                    </div>

                    <div className="match-teams">
                      <div className="team-box">
                        <div className="team-heading">
                          <span>Mandante</span>
                        </div>

                        <strong className="team-name">
                          <TeamFlag teamName={match.home_team} size="lg" />
                          <span>{match.home_team}</span>
                        </strong>
                      </div>

                      <div className="versus-box">x</div>

                      <div className="team-box right">
                        <div className="team-heading right">
                          <span>Visitante</span>
                        </div>

                        <strong className="team-name right">
                          <span>{match.away_team}</span>
                          <TeamFlag teamName={match.away_team} size="lg" />
                        </strong>
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
                              ? `Pontuação atual: ${
                                  match.prediction.points ?? 0
                                } pontos`
                              : 'Informe o placar que você acredita para este jogo.'}
                          </p>
                        </div>

                        {hasPrediction && (
                          <span className="prediction-badge">Salvo</span>
                        )}
                      </div>

                      <div className="score-form">
                        <label>
                          <div className="score-team-label only-flag">
                            <TeamFlag teamName={match.home_team} size="sm" />
                          </div>

                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={2}
                            value={form.predicted_home_score}
                            disabled={!canEdit || savingGroupPredictions}
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
                          <div className="score-team-label right only-flag">
                            <TeamFlag teamName={match.away_team} size="sm" />
                          </div>

                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={2}
                            value={form.predicted_away_score}
                            disabled={!canEdit || savingGroupPredictions}
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
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="group-save-panel">
              <div className="group-save-panel-content">
                <span>Palpites do Grupo {groupName}</span>

                <h2>Salvar todos os palpites do grupo</h2>

                <p>
                  Preencha os placares dos jogos acima e salve tudo de uma vez.
                  Jogos bloqueados são ignorados automaticamente.
                </p>

                <small>
                  {editableMatchesCount === 1
                    ? '1 jogo ainda aceita palpite'
                    : `${editableMatchesCount} jogos ainda aceitam palpite`}
                </small>
              </div>

              <button
                type="button"
                className="group-save-button"
                disabled={savingGroupPredictions || editableMatchesCount === 0}
                onClick={handleSaveGroupPredictions}
              >
                {savingGroupPredictions
                  ? 'Salvando...'
                  : `Salvar palpites do Grupo ${groupName}`}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default GroupMatchesPage;