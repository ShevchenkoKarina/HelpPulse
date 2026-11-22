// Звіти та аналітика: запити з лабораторних робіт №5–7.
import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils.js';

const router = Router();

// GET /api/reports/summary   лічильники для головної та огляду адмін-панелі
router.get('/summary', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM help_request WHERE request_state IN ('нова', 'в обробці')) AS active_requests,
       (SELECT COUNT(*) FROM help_request)                                              AS total_requests,
       (SELECT COUNT(*) FROM v_active_deliveries)                                       AS active_deliveries,
       (SELECT COUNT(*) FROM v_active_deliveries WHERE status_name = 'в дорозі')        AS in_transit,
       (SELECT COUNT(*) FROM delivery d JOIN delivery_status ds ON ds.status_id = d.status_id
          WHERE ds.status_name = 'доставлено')                                          AS delivered,
       (SELECT COUNT(*) FROM donor)                                                     AS donors,
       (SELECT COUNT(*) FROM warehouse)                                                 AS warehouses,
       (SELECT COUNT(*) FROM volunteer)                                                 AS volunteers,
       (SELECT COALESCE(SUM(quantity), 0) FROM stock)                                   AS stock_total,
       (SELECT COUNT(*) FROM feedback)                                                  AS feedback_count,
       (SELECT ROUND(AVG(rating), 2) FROM feedback)                                     AS avg_rating`
  );
  res.json(rows[0]);
}));

// GET /api/reports/regions   виконані доставки за регіонами; is_leader = регіон-лідер
// (ЛР №5, запит 5; ЛР №7, завдання 2: COUNT + GROUP BY + підзапит з MAX)
router.get('/regions', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `WITH region_counts AS (SELECT region, delivered_count FROM v_region_delivered)
     SELECT region, delivered_count,
            delivered_count = (SELECT MAX(delivered_count) FROM region_counts) AS is_leader
     FROM region_counts
     ORDER BY delivered_count DESC, region`
  );
  res.json(rows);
}));

// GET /api/reports/volunteers   навантаження волонтерів і середня оцінка
// (ЛР №5, запит 3; ЛР №6: середня оцінка JOIN + GROUP BY + AVG)
router.get('/volunteers', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT v.volunteer_id, v.volunteer_name, v.phone, v.region,
            COUNT(d.delivery_id)                                              AS deliveries_total,
            COUNT(d.delivery_id) FILTER (WHERE ds.status_name = 'доставлено') AS delivered,
            COUNT(d.delivery_id) FILTER (WHERE ds.status_name IN ('створено', 'зібрано', 'в дорозі')) AS active,
            ROUND(AVG(f.rating), 2)                                           AS avg_rating
     FROM volunteer v
     LEFT JOIN delivery d         ON d.volunteer_id = v.volunteer_id
     LEFT JOIN delivery_status ds ON ds.status_id = d.status_id
     LEFT JOIN feedback f         ON f.delivery_id = d.delivery_id
     GROUP BY v.volunteer_id
     ORDER BY delivered DESC, v.volunteer_name`
  );
  res.json(rows);
}));

// GET /api/reports/requests-by-state   кількість заявок за статусами
router.get('/requests-by-state', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT request_state, COUNT(*) AS count
     FROM help_request GROUP BY request_state
     ORDER BY CASE request_state WHEN 'нова' THEN 1 WHEN 'в обробці' THEN 2 WHEN 'виконана' THEN 3 ELSE 4 END`
  );
  res.json(rows);
}));

// GET /api/reports/deliveries-by-status   кількість доставок за статусами
router.get('/deliveries-by-status', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT ds.status_id, ds.status_name, COUNT(d.delivery_id) AS count
     FROM delivery_status ds
     LEFT JOIN delivery d ON d.status_id = ds.status_id
     GROUP BY ds.status_id ORDER BY ds.status_id`
  );
  res.json(rows);
}));

// GET /api/reports/deliveries-without-feedback   доставки без відгуку (LEFT JOIN, ЛР №6)
router.get('/deliveries-without-feedback', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT d.delivery_id, ds.status_name, d.planned_date, d.actual_date
     FROM delivery d
     JOIN delivery_status ds ON ds.status_id = d.status_id
     LEFT JOIN feedback f    ON f.delivery_id = d.delivery_id
     WHERE f.feedback_id IS NULL
     ORDER BY d.delivery_id`
  );
  res.json(rows);
}));

// GET /api/reports/donations-by-donor   внесок кожного донора
router.get('/donations-by-donor', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT d.donor_id, d.donor_name, d.donor_type,
            COUNT(DISTINCT dn.donation_id)  AS donations_count,
            COALESCE(SUM(di.quantity), 0)   AS total_quantity
     FROM donor d
     LEFT JOIN donation dn       ON dn.donor_id = d.donor_id
     LEFT JOIN donation_item di  ON di.donation_id = dn.donation_id
     GROUP BY d.donor_id
     ORDER BY total_quantity DESC, d.donor_name`
  );
  res.json(rows);
}));

export default router;
