// Заявки на допомогу: перегляд, створення (транзакція), зміна статусу.
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import {
  HttpError, asyncHandler, assertItemsExist, idParam, parseItems, toEnum, toInt, toStr,
} from '../utils.js';

const router = Router();

const STATES = ['нова', 'в обробці', 'виконана', 'скасована'];
const PRIORITIES = ['низький', 'середній', 'високий', 'критичний'];
const REQUESTER_TYPES = ['людина', 'лікарня', 'організація'];

// GET /api/requests                      усі заявки
// GET /api/requests?state=в обробці      фільтр за статусом
// GET /api/requests?active=true          лише активні (нова, в обробці), запит №1 з ЛР №5
router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const conditions = [];

  if (req.query.active === 'true') {
    conditions.push(`request_state IN ('нова', 'в обробці')`);
  }
  if (req.query.state) {
    params.push(toEnum(req.query.state, 'Статус заявки', STATES));
    conditions.push(`request_state = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM v_requests_overview ${where} ORDER BY created_at DESC, request_id DESC`,
    params
  );
  res.json(rows);
}));

// GET /api/requests/:id   заявка з переліком потрібних товарів
router.get('/:id', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер заявки');

  const head = await query(
    `SELECT hr.request_id, hr.created_at, hr.priority, hr.request_state,
            r.requester_id, r.requester_name, r.requester_type,
            r.phone, r.address, r.region
     FROM help_request hr
     JOIN requester r ON r.requester_id = hr.requester_id
     WHERE hr.request_id = $1`,
    [id]
  );
  if (head.rows.length === 0) throw new HttpError(404, 'Заявку не знайдено');

  const items = await query(
    `SELECT i.item_id, i.item_name, i.unit, ic.category_name, ri.quantity_needed
     FROM request_item ri
     JOIN item i           ON i.item_id = ri.item_id
     JOIN item_category ic ON ic.category_id = i.category_id
     WHERE ri.request_id = $1
     ORDER BY ic.category_name, i.item_name`,
    [id]
  );

  res.json({ ...head.rows[0], items: items.rows });
}));

// POST /api/requests   створення заявки ОДНІЄЮ ТРАНЗАКЦІЄЮ:
//   (за потреби) новий заявник -> заявка -> позиції заявки.
// Тіло: { requester_id }  АБО  { requester: { requester_name, requester_type, phone, address, region } },
//       priority (необов'язково), items: [{ item_id, quantity }]
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const items = parseItems(body.items, 'Заявка');
  const priority = body.priority === undefined ? 'середній' : toEnum(body.priority, 'Пріоритет', PRIORITIES);

  const result = await withTransaction(async (client) => {
    await assertItemsExist(client, items);

    let requesterId;
    if (body.requester_id !== undefined) {
      requesterId = toInt(body.requester_id, 'заявник');
      const found = await client.query('SELECT 1 FROM requester WHERE requester_id = $1', [requesterId]);
      if (!found.rows.length) throw new HttpError(404, 'Заявника не знайдено');
    } else if (body.requester) {
      const r = body.requester;
      const created = await client.query(
        `INSERT INTO requester (requester_name, requester_type, phone, address, region)
         VALUES ($1, $2, $3, $4, $5) RETURNING requester_id`,
        [
          toStr(r.requester_name, 'Назва / ПІБ', { max: 150 }),
          toEnum(r.requester_type, 'Тип заявника', REQUESTER_TYPES),
          toStr(r.phone, 'Телефон', { max: 20, required: false }),
          toStr(r.address, 'Адреса', { max: 250 }),
          toStr(r.region, 'Область', { max: 100 }),
        ]
      );
      requesterId = created.rows[0].requester_id;
    } else {
      throw new HttpError(400, 'Потрібно вказати заявника (requester_id або requester)');
    }

    const request = await client.query(
      'INSERT INTO help_request (requester_id, priority) VALUES ($1, $2) RETURNING request_id, created_at, request_state',
      [requesterId, priority]
    );
    const requestId = request.rows[0].request_id;

    for (const it of items) {
      await client.query(
        'INSERT INTO request_item (request_id, item_id, quantity_needed) VALUES ($1, $2, $3)',
        [requestId, it.item_id, it.quantity]
      );
    }

    return { ...request.rows[0], requester_id: requesterId, priority, items_count: items.length };
  });

  res.status(201).json(result);
}));

// PATCH /api/requests/:id   зміна статусу та/або пріоритету.
// Завершену або скасовану заявку змінювати не можна.
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер заявки');
  const body = req.body || {};
  if (body.request_state === undefined && body.priority === undefined) {
    throw new HttpError(400, 'Потрібно вказати request_state та/або priority');
  }
  const state = body.request_state === undefined ? null : toEnum(body.request_state, 'Статус заявки', STATES);
  const priority = body.priority === undefined ? null : toEnum(body.priority, 'Пріоритет', PRIORITIES);

  const current = await query('SELECT request_state FROM help_request WHERE request_id = $1', [id]);
  if (!current.rows.length) throw new HttpError(404, 'Заявку не знайдено');
  if (['виконана', 'скасована'].includes(current.rows[0].request_state)) {
    throw new HttpError(409, `Заявка вже має статус «${current.rows[0].request_state}», змінити її не можна`);
  }

  const { rows } = await query(
    `UPDATE help_request
     SET request_state = COALESCE($1, request_state),
         priority      = COALESCE($2, priority)
     WHERE request_id = $3
     RETURNING request_id, priority, request_state`,
    [state, priority, id]
  );
  res.json(rows[0]);
}));

export default router;
