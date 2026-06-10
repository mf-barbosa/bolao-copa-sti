import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api/api';
import '../styles/auth.css';

function AuthPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    poolCode: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('bolao_token');

    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  function clearMessages() {
    setErrors({});
    setSuccessMessage('');
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    clearMessages();
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;

    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleRegisterChange(event) {
    const { name, value } = event.target;

    setRegisterData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function isValidEmail(email) {
    return email.trim().includes('@');
  }

  function validateLogin() {
    const newErrors = {};

    if (!loginData.email.trim()) {
      newErrors.loginEmail = 'Informe seu e-mail.';
    } else if (!isValidEmail(loginData.email)) {
      newErrors.loginEmail = 'Informe um e-mail válido.';
    }

    if (!loginData.password.trim()) {
      newErrors.loginPassword = 'Informe sua senha.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  function validateRegister() {
    const newErrors = {};

    if (!registerData.name.trim()) {
      newErrors.registerName = 'Escolha um apelido.';
    }

    if (!registerData.email.trim()) {
      newErrors.registerEmail = 'Informe seu e-mail.';
    } else if (!isValidEmail(registerData.email)) {
      newErrors.registerEmail = 'Informe um e-mail válido.';
    }

    if (registerData.password.length < 6) {
      newErrors.registerPassword = 'Crie uma senha com pelo menos 6 caracteres.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin(event) {
    event.preventDefault();

    clearMessages();

    if (!validateLogin()) return;

    try {
      setLoading(true);

      const response = await api.post('/users/login', {
        email: loginData.email,
        password: loginData.password,
      });

      localStorage.setItem('bolao_token', response.data.token);
      localStorage.setItem('bolao_user', JSON.stringify(response.data.user));

      setSuccessMessage('Login feito com sucesso. Redirecionando...');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (error) {
      setErrors({
        loginEmail: error.response?.data?.error || 'E-mail ou senha inválidos.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    clearMessages();

    if (!validateRegister()) return;

    try {
      setLoading(true);

      await api.post('/users', {
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
      });

      const loginResponse = await api.post('/users/login', {
        email: registerData.email,
        password: registerData.password,
      });

      localStorage.setItem('bolao_token', loginResponse.data.token);
      localStorage.setItem(
        'bolao_user',
        JSON.stringify(loginResponse.data.user)
      );

      setSuccessMessage('Conta criada com sucesso. Redirecionando...');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (error) {
      setErrors({
        registerEmail: error.response?.data?.error || 'Erro ao criar conta.',
      });
    } finally {
      setLoading(false);
    }
  }

  function getPasswordStrength() {
    let score = 0;
    const password = registerData.password;

    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return score;
  }

  const strength = getPasswordStrength();

  return (
    <div className="auth-page">
      <div className="flag-strip">
        <div className="strip-green" />
        <div className="strip-blue" />
        <div className="strip-white" />
        <div className="strip-red" />
        <div className="strip-green" />
        <div className="strip-blue" />
      </div>

      <nav className="auth-navbar">
        <div className="auth-brand">
          <img src="/favicon.svg" alt="" className="brand-icon" />

          <div>
            <span className="auth-logo">CHUTAÍ</span>
            <small>O Bolão da Copa do Mundo</small>
          </div>
        </div>

        <span className="auth-nav-text">Copa do Mundo 2026</span>
      </nav>

      <main className="auth-container">
        <section className="auth-left">
          <div className="field-lines" />

          <div className="auth-left-content">
            <p className="auth-tag">Copa do Mundo 2026</p>

            <h1>
              <span>BEM</span>
              <span>VINDO</span>
              <span>DE VOLTA</span>
            </h1>

            <p className="auth-description">
              “Faça login, entre na resenha com seus amigos, e mostre que sabe
              mais que todos.”
            </p>

            <div className="auth-stats">
              <div>
                <strong>48</strong>
                <small>Seleções</small>
              </div>

              <div>
                <strong>104</strong>
                <small>Jogos</small>
              </div>

              <div>
                <strong>1</strong>
                <small>Campeão</small>
              </div>
            </div>
          </div>

          <div className="floating-ball">⚽</div>
        </section>

        <section className="auth-right">
          <div className="auth-card">
            <div className="auth-tabs">
              <button
                type="button"
                className={activeTab === 'login' ? 'active' : ''}
                onClick={() => handleTabChange('login')}
              >
                Entrar
              </button>

              <button
                type="button"
                className={activeTab === 'register' ? 'active' : ''}
                onClick={() => handleTabChange('register')}
              >
                Cadastrar
              </button>
            </div>

            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="seuemail@exemplo.com"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    className={errors.loginEmail ? 'input-error-border' : ''}
                  />

                  {errors.loginEmail && (
                    <small className="error-text">{errors.loginEmail}</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Senha</label>

                  <div className="password-wrapper">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      className={
                        errors.loginPassword ? 'input-error-border' : ''
                      }
                    />

                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? '🙈' : '👁'}
                    </button>
                  </div>

                  {errors.loginPassword && (
                    <small className="error-text">{errors.loginPassword}</small>
                  )}
                </div>

                <div className="form-row">
                  <label className="remember">
                    <input type="checkbox" />
                    Lembrar de mim
                  </label>

                  <button type="button" className="link-button">
                    Esqueci a senha
                  </button>
                </div>

                <button
                  className="submit-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : '⚽ Entrar no bolão'}
                </button>

                {successMessage && (
                  <div className="success-message">{successMessage}</div>
                )}

                <div className="auth-switch">
                  Ainda não tem conta?
                  <button
                    type="button"
                    onClick={() => handleTabChange('register')}
                  >
                    Cadastre-se →
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="auth-form">
                <div className="form-group">
                  <label>Seu apelido no bolão</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ex: Zé Bola, Craque, Paredão..."
                    value={registerData.name}
                    onChange={handleRegisterChange}
                    className={errors.registerName ? 'input-error-border' : ''}
                  />

                  <small className="hint-text">
                    Esse é o nome que aparece no ranking 🏆
                  </small>

                  {errors.registerName && (
                    <small className="error-text">{errors.registerName}</small>
                  )}
                </div>

                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="seuemail@exemplo.com"
                    value={registerData.email}
                    onChange={handleRegisterChange}
                    className={
                      errors.registerEmail ? 'input-error-border' : ''
                    }
                  />

                  {errors.registerEmail && (
                    <small className="error-text">
                      {errors.registerEmail}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Senha</label>

                  <div className="password-wrapper">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      className={
                        errors.registerPassword ? 'input-error-border' : ''
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterPassword(!showRegisterPassword)
                      }
                    >
                      {showRegisterPassword ? '🙈' : '👁'}
                    </button>
                  </div>

                  <div className="strength-bar">
                    {[1, 2, 3, 4].map((item) => (
                      <span
                        key={item}
                        className={strength >= item ? 'active' : ''}
                      />
                    ))}
                  </div>

                  {errors.registerPassword && (
                    <small className="error-text">
                      {errors.registerPassword}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    Código do bolão
                    <span className="optional-badge">Opcional</span>
                  </label>

                  <input
                    type="text"
                    name="poolCode"
                    placeholder="Ex: COPA2026"
                    value={registerData.poolCode}
                    onChange={handleRegisterChange}
                  />

                  <small className="hint-text">
                    Essa parte será conectada depois na seleção de bolão.
                  </small>
                </div>

                <button
                  className="submit-button blue"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Criando conta...' : '🎯 Criar minha conta'}
                </button>

                {successMessage && (
                  <div className="success-message">{successMessage}</div>
                )}

                <div className="auth-switch">
                  Já tem uma conta?
                  <button type="button" onClick={() => handleTabChange('login')}>
                    Entrar →
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <div className="footer-brand">
          <img src="/favicon.svg" alt="" className="footer-icon" />
          <span>CHUTAÍ</span>
        </div>

        <div className="footer-right">
          <p>© Todos os direitos reservados</p>

          <a
            href="https://www.instagram.com/matheus.ferreiraz/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram do Dev"
            className="instagram-link"
          >
            <span>◎</span>
          </a>
        </div>
      </footer>

      <div className="flag-strip">
        <div className="strip-red" />
        <div className="strip-white" />
        <div className="strip-blue" />
        <div className="strip-green" />
        <div className="strip-red" />
        <div className="strip-blue" />
      </div>
    </div>
  );
}

export default AuthPage;