export function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const email = user.email || user.username || '';

  return {
    id: user.id,
    name: user.name || 'Jogador',
    email,
    username: user.username || email,
    is_admin: Number(user.is_admin) === 1 ? 1 : 0,
  };
}

export function getToken() {
  return localStorage.getItem('bolao_token');
}

export function getCurrentUser() {
  const storedUser = localStorage.getItem('bolao_user');

  if (!storedUser) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(storedUser));
  } catch {
    return null;
  }
}

export function saveAuthData(token, user) {
  if (token) {
    localStorage.setItem('bolao_token', token);
  }

  const normalizedUser = normalizeUser(user);

  if (normalizedUser) {
    localStorage.setItem('bolao_user', JSON.stringify(normalizedUser));
  }

  return normalizedUser;
}

export function saveCurrentUser(user) {
  const normalizedUser = normalizeUser(user);

  if (normalizedUser) {
    localStorage.setItem('bolao_user', JSON.stringify(normalizedUser));
  }

  return normalizedUser;
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function isAdmin() {
  const user = getCurrentUser();

  return Number(user?.is_admin) === 1;
}

export function logout() {
  localStorage.removeItem('bolao_token');
  localStorage.removeItem('bolao_user');
  localStorage.removeItem('bolao_selected_pool');
  localStorage.removeItem('bolao_selected_group');
}