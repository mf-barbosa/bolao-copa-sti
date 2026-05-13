import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCurrentUser, logout } from '../auth/authService';

import '../styles/rules.css';

const SCORE_RULES = [
  {
    points: 25,
    title: 'Placar exato',
    description:
      'Você acerta exatamente o placar final da partida.',
    example: 'Palpite: Brasil 2 x 1 Argentina • Resultado: Brasil 2 x 1 Argentina',
    tag: 'Acerto perfeito',
  },
  {
    points: 18,
    title: 'Vencedor + gols do vencedor',
    description:
      'Você acerta quem venceu e também a quantidade de gols do time vencedor.',
    example: 'Palpite: Brasil 2 x 0 Argentina • Resultado: Brasil 2 x 1 Argentina',
    tag: 'Quase perfeito',
  },
  {
    points: 15,
    title: 'Vencedor + diferença de gols',
    description:
      'Você acerta quem venceu e também a diferença de gols entre os times.',
    example: 'Palpite: Brasil 3 x 1 Argentina • Resultado: Brasil 2 x 0 Argentina',
    tag: 'Boa leitura',
  },
  {
    points: 12,
    title: 'Vencedor + gols do perdedor',
    description:
      'Você acerta quem venceu e também a quantidade de gols do time perdedor.',
    example: 'Palpite: Brasil 3 x 1 Argentina • Resultado: Brasil 2 x 1 Argentina',
    tag: 'Acerto parcial',
  },
  {
    points: 10,
    title: 'Apenas resultado correto',
    description:
      'Você acerta apenas o resultado geral: vitória do mandante, empate ou vitória do visitante.',
    example: 'Palpite: Brasil 1 x 0 Argentina • Resultado: Brasil 3 x 2 Argentina',
    tag: 'Resultado certo',
  },
  {
    points: 0,
    title: 'Nenhum acerto',
    description:
      'Você não acerta o placar, nem vencedor, nem empate, conforme o caso.',
    example: 'Palpite: Brasil 2 x 0 Argentina • Resultado: Brasil 1 x 2 Argentina',
    tag: 'Sem pontos',
  },
];

const GENERAL_RULES = [
  {
    icon: '⏰',
    title: 'Prazo dos palpites',
    text: 'Os palpites ficam bloqueados 30 minutos antes do horário da partida.',
  },
  {
    icon: '🔒',
    title: 'Jogos bloqueados',
    text: 'Jogos ao vivo, finalizados ou cancelados não aceitam novos palpites.',
  },
  {
    icon: '🔁',
    title: 'Jogos adiados',
    text: 'Quando um jogo está adiado, o sistema permite criação ou edição de palpites.',
  },
  {
    icon: '🏆',
    title: 'Ranking por bolão',
    text: 'A pontuação é somada separadamente dentro de cada bolão.',
  },
];

function RulesPage() {
  const navigate = useNavigate();

  const user = getCurrentUser();

  const [selectedPool, setSelectedPool] = useState(null);

  const userName = user?.name || 'Jogador';

  useEffect(() => {
    const storedPool = localStorage.getItem('bolao_selected_pool');

    if (!storedPool) return;

    try {
      setSelectedPool(JSON.parse(storedPool));
    } catch {
      localStorage.removeItem('bolao_selected_pool');
    }
  }, []);

  const maxPoints = useMemo(() => {
    return Math.max(...SCORE_RULES.map((rule) => rule.points));
  }, []);

  function handleBackToGroups() {
    navigate('/groups');
  }

  function handleBackToDashboard() {
    navigate('/dashboard');
  }

  function handleOpenRanking() {
    navigate('/ranking');
  }

  function handleLogout() {
    logout();
    localStorage.removeItem('bolao_selected_pool');
    localStorage.removeItem('bolao_selected_group');
    navigate('/', { replace: true });
  }

  return (
    <div className="rules-page">
      <header className="rules-header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={handleBackToGroups}
          >
            ← Voltar aos grupos
          </button>

          <span className="rules-logo">⚽ BolãoCopa STI</span>
          <p>Copa do Mundo 2026</p>
        </div>

        <div className="rules-user-area">
          <div className="rules-user">
            <span>Olá,</span>
            <strong>{userName}</strong>
          </div>

          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="rules-main">
        <section className="rules-hero">
          <div>
            <p className="rules-tag">Regras de pontuação</p>

            <h1>Entenda como ganhar pontos</h1>

            <p className="rules-description">
              O sistema compara seu palpite com o resultado oficial lançado pelo
              administrador e calcula automaticamente sua pontuação dentro do
              bolão selecionado.
            </p>
          </div>

          <aside className="rules-summary-card">
            <span>📘</span>

            <strong>
              {selectedPool ? selectedPool.name : 'Bolão não selecionado'}
            </strong>

            <p>
              {selectedPool
                ? `Código: ${selectedPool.code} • ID: ${selectedPool.id}`
                : 'As regras são gerais e valem para todos os bolões.'}
            </p>

            <div className="rules-summary-grid">
              <div>
                <small>Máximo por jogo</small>
                <strong>{maxPoints}</strong>
              </div>

              <div>
                <small>Ranking</small>
                <strong>Por bolão</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="rules-actions">
          <button type="button" onClick={handleBackToDashboard}>
            Trocar bolão
          </button>

          <button type="button" onClick={handleBackToGroups}>
            Ver grupos
          </button>

          <button type="button" onClick={handleOpenRanking}>
            Ver ranking
          </button>
        </section>

        <section className="rules-highlight">
          <div>
            <span>⚽</span>
            <strong>Resumo rápido</strong>
          </div>

          <p>
            Quanto mais próximo seu palpite estiver do resultado real, maior a
            pontuação. O placar exato é o maior acerto possível.
          </p>
        </section>

        <section className="score-rules-grid">
          {SCORE_RULES.map((rule) => (
            <article key={rule.title} className="score-rule-card">
              <div className="score-rule-top">
                <div>
                  <span>{rule.tag}</span>
                  <strong>{rule.title}</strong>
                </div>

                <div className="points-badge">
                  <strong>{rule.points}</strong>
                  <small>pts</small>
                </div>
              </div>

              <p>{rule.description}</p>

              <div className="rule-example">
                <small>Exemplo</small>
                <span>{rule.example}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="general-rules-section">
          <div className="section-title">
            <p className="rules-tag">Regras gerais</p>
            <h2>O que bloqueia ou libera palpites?</h2>
          </div>

          <div className="general-rules-grid">
            {GENERAL_RULES.map((rule) => (
              <article key={rule.title} className="general-rule-card">
                <span>{rule.icon}</span>
                <strong>{rule.title}</strong>
                <p>{rule.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rules-note">
          <strong>Observação importante</strong>
          <p>
            A pontuação só aparece no ranking depois que o administrador lança o
            resultado oficial da partida. Ao editar um palpite antes do jogo, a
            pontuação daquele palpite volta para 0 até o resultado ser calculado
            novamente.
          </p>
        </section>
      </main>
    </div>
  );
}

export default RulesPage;