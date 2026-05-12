import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCurrentUser, logout } from '../auth/authService';

import '../styles/dashboard.css';

function DashboardPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();

  const [poolCode, setPoolCode] = useState('');
  const [message, setMessage] = useState('');

  const userName = user?.name || 'Jogador';
  const isAdmin = Boolean(user?.is_admin);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  function handleJoinPool(event) {
    event.preventDefault();

    const formattedCode = poolCode.trim().toUpperCase();

    if (!formattedCode) {
      setMessage('Digite o código do bolão para continuar.');
      return;
    }

    setMessage(
      `Código "${formattedCode}" recebido. No próximo passo vamos conectar essa ação com a API.`
    );
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

            <h1>Entre no seu bolão e comece a disputa</h1>

            <p className="dashboard-description">
              Use o código compartilhado pela galera para entrar em um bolão
              existente ou acompanhe os bolões em que você já participa.
            </p>
          </div>

          <div className="dashboard-hero-card">
            <span>🏆</span>
            <strong>Ranking, palpites e grupos</strong>
            <p>
              Depois de entrar em um bolão, você poderá acompanhar jogos,
              enviar palpites e disputar o topo do ranking.
            </p>
          </div>
        </section>

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
                placeholder="Ex: COPA2026"
                value={poolCode}
                onChange={(event) => setPoolCode(event.target.value)}
              />

              <button type="submit">Entrar no bolão</button>
            </form>

            {message && <p className="dashboard-message">{message}</p>}
          </article>

          <article className="dashboard-card">
            <div className="card-header">
              <span>📋</span>
              <div>
                <h2>Meus bolões</h2>
                <p>Lista dos bolões em que você participa.</p>
              </div>
            </div>

            <div className="empty-state">
              <strong>Nenhum bolão carregado ainda</strong>
              <p>
                No próximo passo vamos buscar seus bolões diretamente da API.
              </p>
            </div>
          </article>

          <article className="dashboard-card">
            <div className="card-header">
              <span>⚽</span>
              <div>
                <h2>Próximos jogos</h2>
                <p>Atalho para palpites da Copa.</p>
              </div>
            </div>

            <div className="preview-list">
              <div>
                <span>Grupo A</span>
                <strong>Jogos em breve</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>Aguardando bolão</strong>
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
          </article>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;