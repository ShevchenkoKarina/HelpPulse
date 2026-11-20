// Допоміжні функції: помилки, перевірка вхідних даних.

/** Помилка з HTTP-кодом. Обробник у index.js перетворює її на відповідь клієнту. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Обгортка для async-маршрутів: будь-яка помилка потрапляє в обробник помилок. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

/** Ціле число. Некоректне значення -> 400. */
export function toInt(value, label, { min = 1, max = 2147483647 } = {}) {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (isEmpty(value) || !Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `Некоректне значення поля «${label}»`);
  }
  return n;
}

/** Рядок. Порожній -> null (якщо required: false) або 400. */
export function toStr(value, label, { max = 255, required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw new HttpError(400, `Поле «${label}» обов’язкове`);
    return null;
  }
  const s = String(value).trim();
  if (s.length > max) throw new HttpError(400, `Поле «${label}» задовге (максимум ${max} символів)`);
  return s;
}

/** Значення зі списку дозволених. */
export function toEnum(value, label, allowed, { required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw new HttpError(400, `Поле «${label}» обов’язкове`);
    return null;
  }
  const s = String(value).trim();
  if (!allowed.includes(s)) {
    throw new HttpError(400, `Поле «${label}»: допустимі значення: ${allowed.join(', ')}`);
  }
  return s;
}

/** Додатне число (наприклад, відстань у км). */
export function toNumber(value, label, { required = false } = {}) {
  if (isEmpty(value)) {
    if (required) throw new HttpError(400, `Поле «${label}» обов’язкове`);
    return null;
  }
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `Поле «${label}» має бути додатним числом`);
  return n;
}

/** Дата у форматі РРРР-ММ-ДД. */
export function toDate(value, label, { required = true } = {}) {
  if (isEmpty(value)) {
    if (required) throw new HttpError(400, `Поле «${label}» обов’язкове`);
    return null;
  }
  const s = String(value).trim();
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new HttpError(400, `Поле «${label}»: очікується дата у форматі РРРР-ММ-ДД`);
  }
  return s;
}

/**
 * Перелік товарів [{ item_id, quantity }]. Не може бути порожнім.
 * Повторні товари об'єднуються (бо в таблицях-зв'язках пара ключів унікальна).
 */
export function parseItems(raw, label = 'Товари') {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new HttpError(400, `${label}: потрібно вказати хоча б одну позицію`);
  }
  const merged = new Map();
  for (const row of raw) {
    const item_id = toInt(row?.item_id, 'товар');
    const quantity = toInt(row?.quantity, 'кількість', { min: 1, max: 1000000 });
    merged.set(item_id, (merged.get(item_id) || 0) + quantity);
  }
  // Сортуємо за item_id: однаковий порядок блокування рядків запобігає взаємним блокуванням
  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([item_id, quantity]) => ({ item_id, quantity }));
}

/** Перевіряє, що всі товари існують у довіднику. */
export async function assertItemsExist(client, items) {
  const ids = items.map((i) => i.item_id);
  const { rows } = await client.query('SELECT item_id FROM item WHERE item_id = ANY($1::int[])', [ids]);
  if (rows.length !== ids.length) throw new HttpError(400, 'Серед товарів є такий, якого немає в довіднику');
}

/** Ідентифікатор з адреси (/:id). */
export const idParam = (req, label = 'номер') => toInt(req.params.id, label);
