import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import AppHeader from '../components/AppHeader';

import '../styles/admin.css';

function AdminPage() {
  const navigate = useNavigate();

  const [pools, setPools] = useState([]);
  const [users, setUsers] = useState([]);

  const [poolForm, setPoolForm] = useState({
    name: '',
    code: '',
  });

  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creatingPool, setCreatingPool] = useState(false);

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
        err.response?.data?.error ||
          'Não foi possível carregar os bolões.'
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
        err.response?.data?.error ||
          'Não foi possível carregar os usuários.'
      );
    } finally {
      setLoadingUsers(false);
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

      setMessage(response.data.message || 'Bolão criado com sucesso.');

      setPoolForm({
        name: '',
        code: '',
      });

      await loadPools();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Não foi possível criar o bolão.'
      );
    } finally {
      setCreatingPool(false);
    }
  }

  function formatDate(value) {
    if (!value) return '-';

    return value;
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
              participantes e prepararem o gerenciamento completo do sistema.
            </p>
          </div>

          <aside className="admin-summary-card">
            <span>🛠️</span>
            <strong>Área admin</strong>
            <p>
              Nesta versão inicial, você já pode criar bolões e visualizar os
              usuários cadastrados no sistema.
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
                <p>Crie um bolão e compartilhe o código com os participantes.</p>
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
          </article>

          <article className="admin-card">
            <div className="admin-card-header">
              <span>📋</span>
              <div>
                <h2>Bolões cadastrados</h2>
                <p>Lista geral dos bolões disponíveis no sistema.</p>
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
                {pools.map((pool) => (
                  <article key={pool.id} className="admin-list-item">
                    <div>
                      <strong>{pool.name}</strong>
                      <span>{pool.code}</span>
                    </div>

                    <small>
                      {pool.participants_count ?? 0} participantes
                    </small>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="admin-card users-card">
            <div className="admin-card-header">
              <span>👥</span>
              <div>
                <h2>Usuários cadastrados</h2>
                <p>Participantes e administradores do sistema.</p>
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
                  <span>Nome</span>
                  <span>Usuário</span>
                  <span>Tipo</span>
                </div>

                {users.map((user) => (
                  <div key={user.id} className="admin-table-row">
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                    <span>{Number(user.is_admin) === 1 ? 'Admin' : 'Comum'}</span>
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
                <p>Funcionalidades que vamos conectar depois.</p>
              </div>
            </div>

            <div className="admin-roadmap">
              <div>
                <strong>Jogos</strong>
                <span>Criar/importar jogos da Copa.</span>
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
                <strong>Ranking</strong>
                <span>Acompanhar pontuação depois dos resultados.</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;