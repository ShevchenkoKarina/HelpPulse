// Заявки на допомогу (читання). Створення заявки додамо на наступному кроці.
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

const STATES = ['нова', 'в обробці', 'виконана', 'скасована'];

// GET /api/requests                      усі заявки
// GET /api/requests?state=в обробці      фільтр за статусом
// GET /api/requests?active=true          лише активні (нова, в обробці), запит №1 з ЛР №5
router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const conditions = [];

    if (req.query.active === 'true') {
      conditions.push(`request_state IN ('нова', 'в обробці')`);
    }
    if (req.query.state) {
      if (!STATES.includes(req.query.state)) {
        return res.status(400).json({ error: 'Невідомий статус заявки' });
      }
      params.push(req.query.state);
      conditions.push(`request_state = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM v_requests_overview ${where} ORDER BY created_at DESC, request_id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/requests/:id   заявка з переліком потрібних товарів
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Некоректний номер заявки' });

    const head = await query(
      `SELECT hr.request_id, hr.created_at, hr.priority, hr.request_state,
              r.requester_id, r.requester_name, r.requester_type,
              r.phone, r.address, r.region
       FROM help_request hr
       JOIN requester r ON r.requester_id = hr.requester_id
       WHERE hr.request_id = $1`,
      [id]
    );
    if (head.rows.length === 0) return res.status(404).json({ error: 'Заявку не знайдено' });

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
  } catch (err) {
    next(err);
  }
});

export default router;
