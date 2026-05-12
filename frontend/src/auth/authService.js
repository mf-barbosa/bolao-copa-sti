export function getToken() {
  return localStorage.getItem('bolao_token');
}

export function getCurrentUser() {
  const storedUser = localStorage.getItem('bolao_user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem('bolao_token');
  localStorage.removeItem('bolao_user');
}