import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import AppHeader from '../components/AppHeader';

import '../styles/admin.css';

const MATCH_STATUSES = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'postponed', label: 'Adiado' },
  { value: 'live', label: 'Ao vivo' },
  { value: 'finished', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
];

function AdminPage() {
  const navigate = useNavigate();

  const [pools, setPools] = useState([]);
  const [users, setUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);

  const [selectedPool, setSelectedPool] = useState(null);

  const [poolForm, setPoolForm] = useState({
    name: '',
    code: '',
  });

  const [statusForms, setStatusForms] = useState({});
  const [resultForms, setResultForms] = useState({});

  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);

  const [creatingPool, setCreatingPool] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [deletingPoolId, setDeletingPoolId] = useState(null);
  const [savingStatusMatchId, setSavingStatusMatchId] = useState(null);
  const [savingResultMatchId, setSavingResultMatchId] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    await Promise.all([loadPools(), loadUsers(), loadMatches()]);
  }

  async function loadPools() {
    try {
      setLoadingPools(true);
      setError('');

      const response = await api.get('/pools');

      setPools(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Não foi possível carregar os bolões.'
      );
    } finally {
      setLoadingPools(false);
    }
  }

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      setError('');

      const response = await api.get('/users');

      setUsers(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Não foi possível carregar os usuários.'
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadMatches() {
    try {
      setLoadingMatches(true);
      setError('');

      const response = await api.get('/matches');

      const apiMatches = response.data || [];

      setMatches(apiMatches);
      initializeMatchForms(apiMatches);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Não foi possível carregar os jogos.'
      );
    } finally {
      setLoadingMatches(false);
    }
  }

  async function loadPoolParticipants(pool) {
    if (!pool?.id) {
      setError('Bolão inválido para carregar participantes.');
      return;
    }

    try {
      setLoadingParticipants(true);
      setError('');
      setMessage('');

      const response = await api.get(`/pools/${pool.id}/users`);

      setSelectedPool(response.data.pool);
      setParticipants(response.data.participants || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível carregar os participantes do bolão.'
      );
    } finally {
      setLoadingParticipants(false);
    }
  }

  function initializeMatchForms(apiMatches) {
    const nextStatusForms = {};
    const nextResultForms = {};

    apiMatches.forEach((match) => {
      nextStatusForms[match.id] = {
        status: match.status || 'scheduled',
        match_date: formatDateToInput(match.match_date),
      };

      nextResultForms[match.id] = {
        home_score: match.home_score ?? '',
        away_score: match.away_score ?? '',
      };
    });

    setStatusForms(nextStatusForms);
    setResultForms(nextResultForms);
  }

  const groupOptions = useMemo(() => {
    const groups = matches
      .map((match) => match.group_name)
      .filter(Boolean)
      .filter((group, index, array) => array.indexOf(group) === index);

    return groups.sort((a, b) => String(a).localeCompare(String(b)));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const groupMatches =
        groupFilter === 'all' || match.group_name === groupFilter;

      const statusMatches =
        statusFilter === 'all' || match.status === statusFilter;

      return groupMatches && statusMatches;
    });
  }, [matches, groupFilter, statusFilter]);

  function handleBackToDashboard() {
    navigate('/dashboard');
  }

  function handlePoolFormChange(event) {
    const { name, value } = event.target;

    setPoolForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleStatusFormChange(matchId, field, value) {
    setStatusForms((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  }

  function handleResultFormChange(matchId, field, value) {
    if (value !== '' && Number(value) < 0) return;

    setResultForms((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  }

  function validatePoolForm() {
    if (!poolForm.name.trim()) {
      return 'Informe o nome do bolão.';
    }

    if (!poolForm.code.trim()) {
      return 'Informe o código do bolão.';
    }

    if (poolForm.code.trim().length < 3) {
      return 'O código do bolão deve ter pelo menos 3 caracteres.';
    }

    return null;
  }

  function validateScore(value, label) {
    if (value === '' || value === undefined || value === null) {
      return `${label} é obrigatório.`;
    }

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue)) {
      return `${label} deve ser um número inteiro.`;
    }

    if (numberValue < 0) {
      return `${label} não pode ser negativo.`;
    }

    if (numberValue > 99) {
      return `${label} deve ser menor ou igual a 99.`;
    }

    return null;
  }

  async function handleCreatePool(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    const validationError = validatePoolForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setCreatingPool(true);

      const response = await api.post('/pools', {
        name: poolForm.name.trim(),
        code: poolForm.code.trim().toUpperCase(),
      });

      setMessage(
        response.data.message ||
          'Bolão criado com sucesso. O administrador não entra automaticamente no bolão.'
      );

      setPoolForm({
        name: '',
        code: '',
      });

      await loadPools();
    } catch (err) {
      setError(
        err.response?.data?.error || 'Não foi possível criar o bolão.'
      );
    } finally {
      setCreatingPool(false);
    }
  }

  async function handleRemoveUserFromPool(user) {
    if (!selectedPool?.id || !user?.id) {
      setError('Selecione um bolão e um usuário válido.');
      return;
    }

    const confirmed = window.confirm(
      `Remover "${user.name}" do bolão "${selectedPool.name}"? Os palpites desse usuário neste bolão também serão removidos.`
    );

    if (!confirmed) return;

    try {
      setRemovingUserId(user.id);
      setMessage('');
      setError('');

      const response = await api.delete(
        `/pools/${selectedPool.id}/users/${user.id}`
      );

      setMessage(response.data.message || 'Usuário removido do bolão.');

      await Promise.all([loadPoolParticipants(selectedPool), loadPools()]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível remover o usuário do bolão.'
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleDeletePool(pool) {
    if (!pool?.id) {
      setError('Bolão inválido para exclusão.');
      return;
    }

    const confirmed = window.confirm(
      `Excluir o bolão "${pool.name}"? Essa ação remove participantes e palpites desse bolão, mas mantém os jogos globais.`
    );

    if (!confirmed) return;

    try {
      setDeletingPoolId(pool.id);
      setMessage('');
      setError('');

      const response = await api.delete(`/pools/${pool.id}`);

      setMessage(response.data.message || 'Bolão excluído com sucesso.');

      if (selectedPool?.id === pool.id) {
        setSelectedPool(null);
        setParticipants([]);
      }

      await loadPools();
    } catch (err) {
      setError(
        err.response?.data?.error || 'Não foi possível excluir o bolão.'
      );
    } finally {
      setDeletingPoolId(null);
    }
  }

  async function handleUpdateMatchStatus(match) {
    const form = statusForms[match.id];

    if (!form?.status) {
      setError('Selecione um status para o jogo.');
      return;
    }

    const payload = {
      status: form.status,
    };

    if (form.match_date) {
      payload.match_date = formatInputDateToApi(form.match_date);
    }

    try {
      setSavingStatusMatchId(match.id);
      setMessage('');
      setError('');

      const response = await api.put(`/matches/${match.id}/status`, payload);

      setMessage(
        response.data.message ||
          `Status do jogo ${match.match_number || match.id} atualizado.`
      );

      await loadMatches();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível atualizar o status/horário do jogo.'
      );
    } finally {
      setSavingStatusMatchId(null);
    }
  }

  async function handleSubmitMatchResult(match) {
    const form = resultForms[match.id] || {};

    const homeValidation = validateScore(form.home_score, 'Placar do mandante');
    const awayValidation = validateScore(form.away_score, 'Placar do visitante');

    if (homeValidation) {
      setError(homeValidation);
      return;
    }

    if (awayValidation) {
      setError(awayValidation);
      return;
    }

    const confirmed = window.confirm(
      `Lançar resultado de ${match.home_team} x ${match.away_team}? Essa alteração é global e recalcula a pontuação em todos os bolões.`
    );

    if (!confirmed) return;

    try {
      setSavingResultMatchId(match.id);
      setMessage('');
      setError('');

      const response = await api.put(`/matches/${match.id}/result`, {
        home_score: Number(form.home_score),
        away_score: Number(form.away_score),
      });

      setMessage(
        response.data.message ||
          `Resultado do jogo ${match.match_number || match.id} lançado.`
      );

      await loadMatches();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível lançar o resultado do jogo.'
      );
    } finally {
      setSavingResultMatchId(null);
    }
  }

  function getUserType(user) {
    return Number(user.is_admin) === 1 ? 'Admin' : 'Comum';
  }

  function getParticipantCountText(pool) {
    const count = Number(pool.participants_count || 0);

    if (count === 1) {
      return '1 participante';
    }

    return `${count} participantes`;
  }

  function getStatusLabel(status) {
    const matchStatus = MATCH_STATUSES.find((item) => item.value === status);

    return matchStatus?.label || status || 'Indefinido';
  }

  function getStatusClass(status) {
    return `match-status ${status || 'unknown'}`;
  }

  function formatDateToInput(value) {
    if (!value) return '';

    return String(value).replace(' ', 'T').slice(0, 16);
  }

  function formatInputDateToApi(value) {
    return String(value).replace('T', ' ');
  }

  function formatDateDisplay(value) {
    if (!value) return 'Data não definida';

    return String(value).replace('T', ' ');
  }

  function getMatchTitle(match) {
    if (match.match_number) {
      return `Jogo ${match.match_number}`;
    }

    return `Jogo ID ${match.id}`;
  }

  return (
    <div className="admin-page">
      <AppHeader backLabel="Voltar ao início" onBack={handleBackToDashboard} />

      <main className="admin-main">
        <section className="admin-hero">
          <div>
            <p className="admin-tag">Painel administrativo</p>

            <h1>Gerenciar bolões e jogos globais</h1>

            <p className="admin-description">
              Área restrita para administradores criarem bolões, acompanharem
              participantes e atualizarem os jogos oficiais da Copa de forma
              global para todos os bolões.
            </p>
          </div>

          <aside className="admin-summary-card">
            <span>🛠️</span>
            <strong>Área admin</strong>
            <p>
              Jogos são globais. Palpites e rankings continuam separados por
              bolão.
            </p>

            <div className="admin-summary-grid">
              <div>
                <small>Bolões</small>
                <strong>{pools.length}</strong>
              </div>

              <div>
                <small>Jogos</small>
                <strong>{matches.length}</strong>
              </div>
            </div>
          </aside>
        </section>

        {(message || error) && (
          <section className="admin-feedback">
            {message && <p className="admin-message">{message}</p>}
            {error && <p className="admin-error">{error}</p>}
          </section>
        )}

        <section className="admin-grid">
          <article className="admin-card create-pool-card">
            <div className="admin-card-header">
              <span>🏆</span>
              <div>
                <h2>Criar bolão</h2>
                <p>
                  Crie um bolão e compartilhe o código com os participantes.
                </p>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleCreatePool}>
              <label htmlFor="poolName">Nome do bolão</label>
              <input
                id="poolName"
                type="text"
                name="name"
                placeholder="Ex: Bolão STI"
                value={poolForm.name}
                onChange={handlePoolFormChange}
              />

              <label htmlFor="poolCode">Código do bolão</label>
              <input
                id="poolCode"
                type="text"
                name="code"
                placeholder="Ex: STI2026"
                value={poolForm.code}
                onChange={handlePoolFormChange}
              />

              <button type="submit" disabled={creatingPool}>
                {creatingPool ? 'Criando...' : 'Criar bolão'}
              </button>
            </form>

            <div className="admin-info-box">
              <strong>Importante</strong>
              <p>
                Criar um bolão não adiciona automaticamente o administrador como
                participante. Para participar, use o código do bolão no fluxo
                normal de entrada.
              </p>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <span>📋</span>
              <div>
                <h2>Bolões cadastrados</h2>
                <p>Veja participantes ou exclua bolões do sistema.</p>
              </div>
            </div>

            {loadingPools && (
              <div className="admin-empty">
                <strong>Carregando bolões...</strong>
                <p>Aguarde enquanto buscamos os dados na API.</p>
              </div>
            )}

            {!loadingPools && pools.length === 0 && (
              <div className="admin-empty">
                <strong>Nenhum bolão cadastrado</strong>
                <p>Crie o primeiro bolão usando o formulário ao lado.</p>
              </div>
            )}

            {!loadingPools && pools.length > 0 && (
              <div className="admin-list">
                {pools.map((pool) => {
                  const isSelected = selectedPool?.id === pool.id;
                  const isDeleting = deletingPoolId === pool.id;

                  return (
                    <article
                      key={pool.id}
                      className={`admin-list-item ${
                        isSelected ? 'selected' : ''
                      }`}
                    >
                      <div className="admin-list-main">
                        <strong>{pool.name}</strong>
                        <span>{pool.code}</span>
                        <small>{getParticipantCountText(pool)}</small>
                      </div>

                      <div className="admin-list-actions">
                        <button
                          type="button"
                          onClick={() => loadPoolParticipants(pool)}
                        >
                          Participantes
                        </button>

                        <button
                          type="button"
                          className="danger"
                          disabled={isDeleting}
                          onClick={() => handleDeletePool(pool)}
                        >
                          {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>

          <article className="admin-card participants-card">
            <div className="admin-card-header">
              <span>👥</span>
              <div>
                <h2>Participantes do bolão</h2>
                <p>
                  Selecione um bolão para visualizar e remover participantes.
                </p>
              </div>
            </div>

            {!selectedPool && !loadingParticipants && (
              <div className="admin-empty">
                <strong>Nenhum bolão selecionado</strong>
                <p>
                  Clique em “Participantes” em algum bolão cadastrado para abrir
                  a lista.
                </p>
              </div>
            )}

            {loadingParticipants && (
              <div className="admin-empty">
                <strong>Carregando participantes...</strong>
                <p>Aguarde enquanto buscamos os participantes do bolão.</p>
              </div>
            )}

            {selectedPool && !loadingParticipants && (
              <div className="participants-panel">
                <div className="selected-pool-box">
                  <div>
                    <span>Bolão selecionado</span>
                    <strong>{selectedPool.name}</strong>
                    <small>{selectedPool.code}</small>
                  </div>

                  <p>
                    {participants.length === 1
                      ? '1 participante'
                      : `${participants.length} participantes`}
                  </p>
                </div>

                {participants.length === 0 && (
                  <div className="admin-empty">
                    <strong>Nenhum participante neste bolão</strong>
                    <p>
                      Os usuários aparecem aqui depois que entram usando o
                      código do bolão.
                    </p>
                  </div>
                )}

                {participants.length > 0 && (
                  <div className="participants-list">
                    {participants.map((participant) => {
                      const isRemoving = removingUserId === participant.id;

                      return (
                        <article
                          key={participant.id}
                          className="participant-item"
                        >
                          <div>
                            <strong>{participant.name}</strong>
                            <span>{participant.email}</span>
                            <small>{getUserType(participant)}</small>
                          </div>

                          <button
                            type="button"
                            className="danger"
                            disabled={isRemoving}
                            onClick={() =>
                              handleRemoveUserFromPool(participant)
                            }
                          >
                            {isRemoving ? 'Removendo...' : 'Remover'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </article>

          <article className="admin-card matches-card">
            <div className="admin-card-header">
              <span>⚽</span>
              <div>
                <h2>Jogos globais da Copa</h2>
                <p>
                  Altere horário, status e resultado dos jogos. Essas mudanças
                  valem para todos os bolões.
                </p>
              </div>
            </div>

            <div className="global-warning-box">
              <strong>Alteração global</strong>
              <p>
                Qualquer mudança feita aqui afeta todos os bolões. O resultado
                oficial recalcula a pontuação de todos os palpites ligados ao
                jogo.
              </p>
            </div>

            <div className="matches-filters">
              <label>
                Grupo
                <select
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {groupOptions.map((group) => (
                    <option key={group} value={group}>
                      Grupo {group}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {MATCH_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" onClick={loadMatches} disabled={loadingMatches}>
                {loadingMatches ? 'Atualizando...' : 'Atualizar jogos'}
              </button>
            </div>

            {loadingMatches && (
              <div className="admin-empty">
                <strong>Carregando jogos...</strong>
                <p>Aguarde enquanto buscamos os jogos globais da Copa.</p>
              </div>
            )}

            {!loadingMatches && filteredMatches.length === 0 && (
              <div className="admin-empty">
                <strong>Nenhum jogo encontrado</strong>
                <p>Altere os filtros ou importe os jogos reais novamente.</p>
              </div>
            )}

            {!loadingMatches && filteredMatches.length > 0 && (
              <div className="matches-management-list">
                {filteredMatches.map((match) => {
                  const statusForm = statusForms[match.id] || {
                    status: match.status || 'scheduled',
                    match_date: formatDateToInput(match.match_date),
                  };

                  const resultForm = resultForms[match.id] || {
                    home_score: match.home_score ?? '',
                    away_score: match.away_score ?? '',
                  };

                  const isSavingStatus = savingStatusMatchId === match.id;
                  const isSavingResult = savingResultMatchId === match.id;

                  return (
                    <article key={match.id} className="admin-match-card">
                      <div className="admin-match-top">
                        <div>
                          <span>{getMatchTitle(match)}</span>
                          <strong>
                            {match.home_team} x {match.away_team}
                          </strong>
                          <small>
                            Grupo {match.group_name} •{' '}
                            {formatDateDisplay(match.match_date)}
                          </small>
                        </div>

                        <span className={getStatusClass(match.status)}>
                          {getStatusLabel(match.status)}
                        </span>
                      </div>

                      <div className="admin-match-result">
                        <span>Resultado atual</span>

                        <strong>
                          {match.home_score === null || match.away_score === null
                            ? 'Ainda não lançado'
                            : `${match.home_score} x ${match.away_score}`}
                        </strong>
                      </div>

                      <div className="match-admin-forms">
                        <div className="match-admin-box">
                          <h3>Status e horário</h3>

                          <label>
                            Status
                            <select
                              value={statusForm.status}
                              disabled={isSavingStatus}
                              onChange={(event) =>
                                handleStatusFormChange(
                                  match.id,
                                  'status',
                                  event.target.value
                                )
                              }
                            >
                              {MATCH_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            Data e horário
                            <input
                              type="datetime-local"
                              value={statusForm.match_date}
                              disabled={isSavingStatus}
                              onChange={(event) =>
                                handleStatusFormChange(
                                  match.id,
                                  'match_date',
                                  event.target.value
                                )
                              }
                            />
                          </label>

                          <button
                            type="button"
                            disabled={isSavingStatus}
                            onClick={() => handleUpdateMatchStatus(match)}
                          >
                            {isSavingStatus ? 'Salvando...' : 'Salvar status'}
                          </button>
                        </div>

                        <div className="match-admin-box">
                          <h3>Resultado oficial</h3>

                          <div className="result-inputs">
                            <label>
                              {match.home_team}
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={resultForm.home_score}
                                disabled={isSavingResult}
                                onChange={(event) =>
                                  handleResultFormChange(
                                    match.id,
                                    'home_score',
                                    event.target.value
                                  )
                                }
                              />
                            </label>

                            <span>x</span>

                            <label>
                              {match.away_team}
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={resultForm.away_score}
                                disabled={isSavingResult}
                                onChange={(event) =>
                                  handleResultFormChange(
                                    match.id,
                                    'away_score',
                                    event.target.value
                                  )
                                }
                              />
                            </label>
                          </div>

                          <button
                            type="button"
                            className="result-button"
                            disabled={isSavingResult}
                            onClick={() => handleSubmitMatchResult(match)}
                          >
                            {isSavingResult
                              ? 'Calculando...'
                              : 'Lançar resultado'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>

          <article className="admin-card users-card">
            <div className="admin-card-header">
              <span>🧑‍💻</span>
              <div>
                <h2>Usuários cadastrados</h2>
                <p>Participantes e administradores registrados no sistema.</p>
              </div>
            </div>

            {loadingUsers && (
              <div className="admin-empty">
                <strong>Carregando usuários...</strong>
                <p>Aguarde enquanto buscamos os usuários na API.</p>
              </div>
            )}

            {!loadingUsers && users.length === 0 && (
              <div className="admin-empty">
                <strong>Nenhum usuário encontrado</strong>
                <p>A lista de usuários ainda está vazia.</p>
              </div>
            )}

            {!loadingUsers && users.length > 0 && (
              <div className="admin-table">
                <div className="admin-table-header">
                  <span>Nome no bolão</span>
                  <span>E-mail</span>
                  <span>Tipo</span>
                </div>

                {users.map((user) => (
                  <div key={user.id} className="admin-table-row">
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                    <span>{getUserType(user)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="admin-card roadmap-card">
            <div className="admin-card-header">
              <span>📌</span>
              <div>
                <h2>Próximas funções admin</h2>
                <p>Funcionalidades que ainda podem entrar no painel.</p>
              </div>
            </div>

            <div className="admin-roadmap">
              <div>
                <strong>Importação</strong>
                <span>Manter jogos reais pelo arquivo matches2026.json.</span>
              </div>

              <div>
                <strong>Auditoria</strong>
                <span>Registrar alterações importantes feitas por admins.</span>
              </div>

              <div>
                <strong>Mata-mata</strong>
                <span>Adicionar jogos eliminatórios quando os confrontos forem definidos.</span>
              </div>

              <div>
                <strong>Automação</strong>
                <span>Estudar integração futura com API externa de resultados.</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;