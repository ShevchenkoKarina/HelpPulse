// Відгуки отримувачів допомоги (таблиця feedback з ЛР №6).
import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, asyncHandler, idParam, toInt, toStr } from '../utils.js';

const router = Router();

// GET /api/feedback   усі відгуки (v_feedback_full): доставка, отримувач, волонтер, оцінка
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM v_feedback_full ORDER BY feedback_date DESC, feedback_id DESC');
  res.json(rows);
}));

// GET /api/feedback/summary   середня оцінка і розподіл оцінок
router.get('/summary', asyncHandler(async (req, res) => {
  const total = await query('SELECT COUNT(*) AS count, ROUND(AVG(rating), 2) AS average FROM feedback');
  const dist = await query(
    `SELECT g.rating, COUNT(f.feedback_id) AS count
     FROM generate_series(1, 5) AS g(rating)
     LEFT JOIN feedback f ON f.rating = g.rating
     GROUP BY g.rating ORDER BY g.rating DESC`
  );
  res.json({ ...total.rows[0], distribution: dist.rows });
}));

// POST /api/feedback   { delivery_id, rating: 1..5, review_text? }
// Відгук можна залишити лише для доставленої доставки, по одному на доставку.
// Отримувач визначається автоматично: заявник тієї заявки, під яку зібрано набір.
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const deliveryId = toInt(body.delivery_id, 'доставка');
  const rating = toInt(body.rating, 'Оцінка', { min: 1, max: 5 });
  const text = toStr(body.review_text, 'Текст відгуку', { max: 1000, required: false });

  const d = await query(
    `SELECT ds.status_name, hr.requester_id
     FROM delivery d
     JOIN delivery_status ds ON ds.status_id = d.status_id
     JOIN aid_kit k          ON k.kit_id = d.kit_id
     JOIN help_request hr    ON hr.request_id = k.request_id
     WHERE d.delivery_id = $1`,
    [deliveryId]
  );
  if (!d.rows.length) throw new HttpError(404, 'Доставку не знайдено');
  if (d.rows[0].status_name !== 'доставлено') {
    throw new HttpError(409, 'Відгук можна залишити лише після того, як допомогу доставлено');
  }
  const exists = await query('SELECT 1 FROM feedback WHERE delivery_id = $1', [deliveryId]);
  if (exists.rows.length) throw new HttpError(409, 'Відгук для цієї доставки вже залишено');

  const { rows } = await query(
    `INSERT INTO feedback (requester_id, delivery_id, rating, review_text)
     VALUES ($1, $2, $3, $4) RETURNING feedback_id, delivery_id, rating, review_text, created_at`,
    [d.rows[0].requester_id, deliveryId, rating, text]
  );
  res.status(201).json(rows[0]);
}));

// DELETE /api/feedback/:id   модерація: видалення відгуку
router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM feedback WHERE feedback_id = $1', [idParam(req, 'номер відгуку')]);
  if (!rowCount) throw new HttpError(404, 'Відгук не знайдено');
  res.status(204).end();
}));

export default router;
