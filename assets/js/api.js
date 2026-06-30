/**
 * API Utility Module for BI Pelampung Frontend
 * Handles all communication with the FastAPI backend
 */

const API_BASE = window.__API_BASE__ || 'http://127.0.0.1:8000/api/v1';

/**
 * Get stored access token
 */
function getToken() {
  return localStorage.getItem('access_token');
}

/**
 * Get stored refresh token
 */
function getRefreshToken() {
  return localStorage.getItem('refresh_token');
}

/**
 * Check if user is authenticated, redirect to login if not
 */
function requireAuth(allowedRoles = []) {
  const token = getToken();
  const role = localStorage.getItem('user_role');
  
  if (!token) {
    window.location.href = '../index.html';
    return false;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    window.location.href = '../index.html';
    return false;
  }

  return true;
}

/**
 * Logout: clear all stored auth data and redirect to login
 */
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_id');
  window.location.href = '../index.html';
}

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, {
      method: 'POST'
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access_token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Authenticated fetch wrapper with auto token refresh
 */
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Authorization': `Bearer ${getToken()}`,
    ...options.headers
  };

  let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // If 401/403, try refreshing the token once
  if (res.status === 401 || res.status === 403) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } else {
      logout();
      return null;
    }
  }

  return res;
}
