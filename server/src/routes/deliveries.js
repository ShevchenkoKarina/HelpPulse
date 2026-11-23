// Доставки: перегляд, створення, зміна статусу, завершення .
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import {
  HttpError, asyncHandler, idParam, toDate, toEnum, toInt, toNumber, toStr,
} from '../utils.js';

const router = Router();

const STATUSES = ['створено', 'зібрано', 'в дорозі', 'доставлено', 'скасовано'];

// Дозволені переходи статусу. Статус «доставлено» ставиться лише через POST /:id/complete.
const TRANSITIONS = {
  'створено': ['зібрано', 'скасовано'],
  'зібрано': ['в дорозі', 'скасовано'],
  'в дорозі': ['скасовано'],
};

// GET /api/deliveries                   усі доставки (представлення v_deliveries_full)
// GET /api/deliveries?active=true       лише активні (v_active_deliveries,)
// GET /api/deliveries?status=в дорозі   фільтр за статусом
router.get('/', asyncHandler(async (req, res) => {
  if (req.query.active === 'true') {
    const { rows } = await query('SELECT * FROM v_active_deliveries ORDER BY planned_date, delivery_id');
    return res.json(rows);
  }
  const params = [];
  let where = '';
  if (req.query.status) {
    params.push(toEnum(req.query.status, 'Статус доставки', STATUSES));
    where = 'WHERE status_name = $1';
  }
  const { rows } = await query(
    `SELECT * FROM v_deliveries_full ${where} ORDER BY planned_date DESC, delivery_id DESC`,
    params
  );
  res.json(rows);
}));

// GET /api/deliveries/:id   доставка з вмістом набору та відгуком
router.get('/:id', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер доставки');
  const head = await query(
    `SELECT f.*, d.kit_id, rt.route_id, v.phone AS volunteer_phone
     FROM v_deliveries_full f
     JOIN delivery d  ON d.delivery_id = f.delivery_id
     JOIN route rt    ON rt.route_id = d.route_id
     JOIN volunteer v ON v.volunteer_id = f.volunteer_id
     WHERE f.delivery_id = $1`,
    [id]
  );
  if (!head.rows.length) throw new HttpError(404, 'Доставку не знайдено');

  const items = await query(
    `SELECT i.item_id, i.item_name, i.unit, ki.quantity
     FROM delivery d
     JOIN kit_item ki ON ki.kit_id = d.kit_id
     JOIN item i      ON i.item_id = ki.item_id
     WHERE d.delivery_id = $1
     ORDER BY i.item_name`,
    [id]
  );
  const fb = await query(
    'SELECT feedback_id, rating, review_text, created_at FROM feedback WHERE delivery_id = $1',
    [id]
  );
  res.json({ ...head.rows[0], items: items.rows, feedback: fb.rows[0] || null });
}));

// POST /api/deliveries   призначення доставки для набору.
// Тіло: { kit_id, volunteer_id, route_id  АБО  route: { start_point, end_point, distance_km },
//         planned_date, volunteer_note? }
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const kitId = toInt(body.kit_id, 'набір');
  const volunteerId = toInt(body.volunteer_id, 'волонтер');
  const plannedDate = toDate(body.planned_date, 'Планова дата');
  const note = toStr(body.volunteer_note, 'Примітка', { max: 500, required: false });

  const result = await withTransaction(async (client) => {
    const kit = await client.query('SELECT 1 FROM aid_kit WHERE kit_id = $1', [kitId]);
    if (!kit.rows.length) throw new HttpError(404, 'Набір не знайдено');
    const vol = await client.query('SELECT 1 FROM volunteer WHERE volunteer_id = $1', [volunteerId]);
    if (!vol.rows.length) throw new HttpError(404, 'Волонтера не знайдено');
    const dup = await client.query('SELECT delivery_id FROM delivery WHERE kit_id = $1', [kitId]);
    if (dup.rows.length) throw new HttpError(409, `Для цього набору доставку вже створено (№${dup.rows[0].delivery_id})`);

    let routeId;
    if (body.route_id !== undefined) {
      routeId = toInt(body.route_id, 'маршрут');
      const r = await client.query('SELECT 1 FROM route WHERE route_id = $1', [routeId]);
      if (!r.rows.length) throw new HttpError(404, 'Маршрут не знайдено');
    } else if (body.route) {
      const created = await client.query(
        'INSERT INTO route (start_point, end_point, distance_km) VALUES ($1, $2, $3) RETURNING route_id',
        [
          toStr(body.route.start_point, 'Початок маршруту', { max: 200 }),
          toStr(body.route.end_point, 'Кінець маршруту', { max: 200 }),
          toNumber(body.route.distance_km, 'Відстань, км'),
        ]
      );
      routeId = created.rows[0].route_id;
    } else {
      throw new HttpError(400, 'Потрібно вказати маршрут (route_id або route)');
    }

    const created = await client.query(
      `INSERT INTO delivery (kit_id, volunteer_id, route_id, status_id, planned_date, volunteer_note)
       VALUES ($1, $2, $3, (SELECT status_id FROM delivery_status WHERE status_name = 'створено'), $4, $5)
       RETURNING delivery_id`,
      [kitId, volunteerId, routeId, plannedDate, note]
    );
    return { delivery_id: created.rows[0].delivery_id, kit_id: kitId, volunteer_id: volunteerId, route_id: routeId, status_name: 'створено' };
  });

  res.status(201).json(result);
}));

// PATCH /api/deliveries/:id/status   { status_name }
// створено -> зібрано -> в дорозі; з будь-якого незавершеного можна «скасовано».
// Якщо доставку скасовано, товари з набору повертаються на склад (транзакція).
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер доставки');
  const target = toEnum(req.body?.status_name, 'Статус доставки', STATUSES);
  if (target === 'доставлено') {
    throw new HttpError(400, 'Статус «доставлено» ставиться через завершення доставки (POST /api/deliveries/:id/complete)');
  }

  const result = await withTransaction(async (client) => {
    const cur = await client.query(
      `SELECT ds.status_name, d.kit_id, k.warehouse_id
       FROM delivery d
       JOIN delivery_status ds ON ds.status_id = d.status_id
       JOIN aid_kit k ON k.kit_id = d.kit_id
       WHERE d.delivery_id = $1 FOR UPDATE OF d`,
      [id]
    );
    if (!cur.rows.length) throw new HttpError(404, 'Доставку не знайдено');
    const from = cur.rows[0].status_name;
    if (!(TRANSITIONS[from] || []).includes(target)) {
      throw new HttpError(409, `Перехід «${from}» -> «${target}» неможливий`);
    }

    await client.query(
      'UPDATE delivery SET status_id = (SELECT status_id FROM delivery_status WHERE status_name = $1) WHERE delivery_id = $2',
      [target, id]
    );

    if (target === 'скасовано') {
      await client.query(
        `INSERT INTO stock (warehouse_id, item_id, quantity)
         SELECT $1, ki.item_id, ki.quantity FROM kit_item ki WHERE ki.kit_id = $2
         ON CONFLICT (warehouse_id, item_id)
         DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity`,
        [cur.rows[0].warehouse_id, cur.rows[0].kit_id]
      );
    }
    return { delivery_id: id, status_name: target, previous_status: from };
  });

  res.json(result);
}));

// PATCH /api/deliveries/:id/note   { volunteer_note }   примітка волонтера (поле з ЛР №6)
router.patch('/:id/note', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер доставки');
  const note = toStr(req.body?.volunteer_note, 'Примітка', { max: 500, required: false });
  const { rows } = await query(
    'UPDATE delivery SET volunteer_note = $1 WHERE delivery_id = $2 RETURNING delivery_id, volunteer_note',
    [note, id]
  );
  if (!rows.length) throw new HttpError(404, 'Доставку не знайдено');
  res.json(rows[0]);
}));

// POST /api/deliveries/:id/complete   ТРАНЗАКЦІЯ завершення доставки:
//   BEGIN -> UPDATE delivery (статус «доставлено», actual_date) -> (UPDATE заявки) -> INSERT feedback -> COMMIT.
// Тіло (необов'язкове): { rating: 1..5, review_text }. Якщо rating вказано, додається відгук.
// Якщо будь-яка з дій не вдалася, ROLLBACK: статус доставки не змінюється.
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер доставки');
  const body = req.body || {};
  const hasFeedback = body.rating !== undefined && body.rating !== null && body.rating !== '';
  const rating = hasFeedback ? toInt(body.rating, 'Оцінка', { min: 1, max: 5 }) : null;
  const reviewText = toStr(body.review_text, 'Текст відгуку', { max: 1000, required: false });

  const result = await withTransaction(async (client) => {
    const cur = await client.query(
      `SELECT ds.status_name, hr.request_id, hr.requester_id
       FROM delivery d
       JOIN delivery_status ds ON ds.status_id = d.status_id
       JOIN aid_kit k          ON k.kit_id = d.kit_id
       JOIN help_request hr    ON hr.request_id = k.request_id
       WHERE d.delivery_id = $1 FOR UPDATE OF d`,
      [id]
    );
    if (!cur.rows.length) throw new HttpError(404, 'Доставку не знайдено');
    const { status_name: from, request_id: requestId, requester_id: requesterId } = cur.rows[0];
    if (from !== 'в дорозі') {
      throw new HttpError(409, `Завершити можна лише доставку зі статусом «в дорозі», а зараз вона «${from}»`);
    }

    await client.query(
      `UPDATE delivery
       SET status_id   = (SELECT status_id FROM delivery_status WHERE status_name = 'доставлено'),
           actual_date = CURRENT_DATE
       WHERE delivery_id = $1`,
      [id]
    );

    // Заявка стає «виконана», коли всі її набори доставлені (або скасовані)
    await client.query(
      `UPDATE help_request SET request_state = 'виконана'
       WHERE request_id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM aid_kit k
           LEFT JOIN delivery d4       ON d4.kit_id = k.kit_id
           LEFT JOIN delivery_status s ON s.status_id = d4.status_id
           WHERE k.request_id = $1
             AND s.status_name IS DISTINCT FROM 'доставлено'
             AND s.status_name IS DISTINCT FROM 'скасовано'
         )`,
      [requestId]
    );

    let feedbackId = null;
    if (hasFeedback) {
      const fb = await client.query(
        `INSERT INTO feedback (requester_id, delivery_id, rating, review_text)
         VALUES ($1, $2, $3, $4) RETURNING feedback_id`,
        [requesterId, id, rating, reviewText]
      );
      feedbackId = fb.rows[0].feedback_id;
    }
    return { delivery_id: id, status_name: 'доставлено', feedback_id: feedbackId };
  });

  res.json(result);
}));

export default router;
