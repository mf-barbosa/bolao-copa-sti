import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import AppHeader from '../components/AppHeader';

import '../styles/admin.css';

function AdminPage() {
  const navigate = useNavigate();

  const [pools, setPools] = useState([]);
  const [users, setUsers] = useState([]);
  const [participants, setParticipants] = useState([]);

  const [selectedPool, setSelectedPool] = useState(null);

  const [poolForm, setPoolForm] = useState({
    name: '',
    code: '',
  });

  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [creatingPool, setCreatingPool] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [deletingPoolId, setDeletingPoolId] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    await Promise.all([loadPools(), loadUsers()]);
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

  return (
    <div className="admin-page">
      <AppHeader backLabel="Voltar ao início" onBack={handleBackToDashboard} />

      <main className="admin-main">
        <section className="admin-hero">
          <div>
            <p className="admin-tag">Painel administrativo</p>

            <h1>Gerenciar bolões e usuários</h1>

            <p className="admin-description">
              Área restrita para administradores criarem bolões, acompanharem
              participantes, removerem usuários de bolões e excluírem bolões
              quando necessário.
            </p>
          </div>

          <aside className="admin-summary-card">
            <span>🛠️</span>
            <strong>Área admin</strong>
            <p>
              Gerencie a estrutura principal do sistema sem alterar os jogos
              globais da Copa.
            </p>

            <div className="admin-summary-grid">
              <div>
                <small>Bolões</small>
                <strong>{pools.length}</strong>
              </div>

              <div>
                <small>Usuários</small>
                <strong>{users.length}</strong>
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
              <span>⚽</span>
              <div>
                <h2>Próximas funções admin</h2>
                <p>Funcionalidades que ainda podem entrar no painel.</p>
              </div>
            </div>

            <div className="admin-roadmap">
              <div>
                <strong>Jogos</strong>
                <span>Criar, editar e excluir jogos da Copa.</span>
              </div>

              <div>
                <strong>Status</strong>
                <span>Alterar jogo para adiado, ao vivo ou cancelado.</span>
              </div>

              <div>
                <strong>Resultados</strong>
                <span>Lançar placar oficial e calcular pontuação.</span>
              </div>

              <div>
                <strong>Auditoria</strong>
                <span>Registrar alterações importantes feitas por admins.</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;