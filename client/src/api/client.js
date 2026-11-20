import { getToken, clearToken } from './auth.js';

// Єдине місце, через яке клієнт спілкується з бекендом.
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  const token = getToken();
  try {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Не вдалося зв’язатися із сервером. Перевірте, що бекенд запущено.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    // Токен недійсний або прострочений: скидаємо вхід, адмінка попросить пароль знову
    clearToken();
    window.dispatchEvent(new Event('helppulse:logout'));
  }
  if (!res.ok) throw new ApiError(data?.error || 'Сталася помилка. Спробуйте ще раз.', res.status);
  return data;
}
