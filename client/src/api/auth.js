// Токен координатора живе в sessionStorage: зникає, коли закрито вкладку.
const KEY = 'helppulse_admin_token';

export function getToken() {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}
export function setToken(token) {
  try { sessionStorage.setItem(KEY, token); } catch { /* сховище недоступне: вхід діятиме до перезавантаження */ }
}
export function clearToken() {
  try { sessionStorage.removeItem(KEY); } catch { /* нічого */ }
}
