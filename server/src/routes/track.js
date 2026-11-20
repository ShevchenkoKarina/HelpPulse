// Публічне відстеження заявки за номером. Номери заявок прості числа, тому тут
// НЕ повертаємо телефон, адресу отримувача, кінець маршруту та прізвище волонтера.
import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, asyncHandler, idParam } from '../utils.js';

const router = Router();

// GET /api/track/:id   стан заявки, перелік товарів і статус доставок
router.get('/:id', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер заявки');

  const head = await query(
    `SELECT hr.request_id, hr.created_at, hr.priority, hr.request_state, r.region
     FROM help_request hr
     JOIN requester r ON r.requester_id = hr.requester_id
     WHERE hr.request_id = $1`,
    [id]
  );
  if (!head.rows.length) throw new HttpError(404, 'Заявку з таким номером не знайдено');

  const items = await query(
    `SELECT i.item_name, i.unit, ri.quantity_needed
     FROM request_item ri JOIN item i ON i.item_id = ri.item_id
     WHERE ri.request_id = $1 ORDER BY i.item_name`,
    [id]
  );

  const deliveries = await query(
    `SELECT d.delivery_id, ds.status_id, ds.status_name, d.planned_date, d.actual_date,
            SPLIT_PART(v.volunteer_name, ' ', 1) AS volunteer_first_name,
            rt.start_point,
            (f.feedback_id IS NOT NULL) AS has_feedback
     FROM aid_kit k
     JOIN delivery d         ON d.kit_id = k.kit_id
     JOIN delivery_status ds ON ds.status_id = d.status_id
     JOIN volunteer v        ON v.volunteer_id = d.volunteer_id
     JOIN route rt           ON rt.route_id = d.route_id
     LEFT JOIN feedback f    ON f.delivery_id = d.delivery_id
     WHERE k.request_id = $1
     ORDER BY d.delivery_id`,
    [id]
  );

  res.json({ ...head.rows[0], items: items.rows, deliveries: deliveries.rows });
}));

export default router;
