// Універсальний CRUD для простих таблиць (довідники, заявники, донори, волонтери...).
// Для кожної таблиці достатньо описати колонки: назва, тип, обов'язковість.
import { Router } from 'express';
import { query } from './db.js';
import { HttpError, asyncHandler, idParam, toEnum, toInt, toNumber, toStr } from './utils.js';

/** Конструктори описів колонок. */
export const col = {
  str: (label, { max = 255, required = true, dbDefault = false } = {}) => ({
    label, required, dbDefault, parse: (v) => toStr(v, label, { max, required }),
  }),
  int: (label, { required = true } = {}) => ({
    label, required, parse: (v) => toInt(v, label),
  }),
  num: (label, { required = false } = {}) => ({
    label, required, parse: (v) => toNumber(v, label, { required }),
  }),
  enum: (label, allowed, { required = true } = {}) => ({
    label, required, parse: (v) => toEnum(v, label, allowed, { required }),
  }),
};

/**
 * crud({ table, pk, columns, orderBy, listQuery })
 *   GET    /        список (можна підмінити запитом listQuery(req) -> { text, params })
 *   GET    /:id     один запис
 *   POST   /        створення
 *   PATCH  /:id     зміна (достатньо передати лише змінені поля), PUT працює так само
 *   DELETE /:id     видалення (409, якщо запис використовується в інших таблицях)
 */
export function crud({ table, pk, columns, orderBy, listQuery }) {
  const router = Router();

  function parseBody(body = {}, { partial }) {
    const values = {};
    for (const [name, def] of Object.entries(columns)) {
      if (body[name] === undefined) {
        if (!partial && def.required && !def.dbDefault) {
          throw new HttpError(400, `Поле «${def.label}» обов’язкове`);
        }
        continue;
      }
      values[name] = def.parse(body[name]);
    }
    if (Object.keys(values).length === 0) throw new HttpError(400, 'Немає даних для збереження');
    return values;
  }

  router.get('/', asyncHandler(async (req, res) => {
    const q = listQuery
      ? listQuery(req)
      : { text: `SELECT * FROM ${table} ORDER BY ${orderBy}`, params: [] };
    const { rows } = await query(q.text, q.params);
    res.json(rows);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [idParam(req)]);
    if (!rows.length) throw new HttpError(404, 'Запис не знайдено');
    res.json(rows[0]);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const values = parseBody(req.body, { partial: false });
    const names = Object.keys(values);
    const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(
      `INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      names.map((n) => values[n])
    );
    res.status(201).json(rows[0]);
  }));

  const update = asyncHandler(async (req, res) => {
    const id = idParam(req);
    const values = parseBody(req.body, { partial: true });
    const names = Object.keys(values);
    const sets = names.map((n, i) => `${n} = $${i + 1}`).join(', ');
    const { rows } = await query(
      `UPDATE ${table} SET ${sets} WHERE ${pk} = $${names.length + 1} RETURNING *`,
      [...names.map((n) => values[n]), id]
    );
    if (!rows.length) throw new HttpError(404, 'Запис не знайдено');
    res.json(rows[0]);
  });
  router.patch('/:id', update);
  router.put('/:id', update);

  router.delete('/:id', asyncHandler(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM ${table} WHERE ${pk} = $1`, [idParam(req)]);
    if (!rowCount) throw new HttpError(404, 'Запис не знайдено');
    res.status(204).end();
  }));

  return router;
}
