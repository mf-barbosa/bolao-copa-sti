const TOKEN_KEY = 'bolao_token';
const USER_KEY = 'bolao_user';
const SELECTED_POOL_KEY = 'bolao_selected_pool';
const SELECTED_GROUP_KEY = 'bolao_selected_group';
const LAST_ACTIVITY_KEY = 'bolao_last_activity';

export const SESSION_TIMEOUT_MS = 3 * 60 * 1000;

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
  return localStorage.getItem(TOKEN_KEY);
}

export function getLastActivityAt() {
  const storedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  const lastActivityNumber = Number(storedLastActivity);

  if (!storedLastActivity || Number.isNaN(lastActivityNumber)) {
    return null;
  }

  return lastActivityNumber;
}

export function updateSessionActivity() {
  if (!getToken()) {
    return;
  }

  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function isSessionExpired() {
  if (!getToken()) {
    return false;
  }

  const lastActivityAt = getLastActivityAt();

  if (!lastActivityAt) {
    return false;
  }

  return Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
}

export function getCurrentUser() {
  if (isSessionExpired()) {
    return null;
  }

  const storedUser = localStorage.getItem(USER_KEY);

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
    localStorage.setItem(TOKEN_KEY, token);
  }

  const normalizedUser = normalizeUser(user);

  if (normalizedUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  }

  updateSessionActivity();

  return normalizedUser;
}

export function saveCurrentUser(user) {
  const normalizedUser = normalizeUser(user);

  if (normalizedUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  }

  return normalizedUser;
}

export function isAuthenticated() {
  return Boolean(getToken()) && !isSessionExpired();
}

export function isAdmin() {
  if (!isAuthenticated()) {
    return false;
  }

  const user = getCurrentUser();

  return Number(user?.is_admin) === 1;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SELECTED_POOL_KEY);
  localStorage.removeItem(SELECTED_GROUP_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}