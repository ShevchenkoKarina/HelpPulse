// Залишки на складах (ЛР №5, запит 2).
import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, asyncHandler, toInt } from '../utils.js';

const router = Router();

// GET /api/stock                   залишки по всіх складах, від більшого до меншого
// GET /api/stock?warehouse_id=2    залишки одного складу
// GET /api/stock?item_id=5         де є цей товар
// GET /api/stock?category=їж&q=вод пошук за частиною назви категорії та/або товару (без урахування регістру);
//                                  умови поєднуються через AND, їх можна комбінувати зі складом
router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const conditions = [];
  // Підрядок шукаємо через POSITION, тому символи % і _ у пошуку не працюють як шаблон
  const search = (value, column, label) => {
    const text = String(value ?? '').trim();
    if (!text) return;
    if (text.length > 100) throw new HttpError(400, `Пошук «${label}» задовгий (максимум 100 символів)`);
    params.push(text);
    conditions.push(`POSITION(LOWER($${params.length}) IN LOWER(${column})) > 0`);
  };
  search(req.query.category, 'category_name', 'категорія');
  search(req.query.q, 'item_name', 'товар');
  if (req.query.warehouse_id) {
    params.push(toInt(req.query.warehouse_id, 'склад'));
    conditions.push(`warehouse_id = $${params.length}`);
  }
  if (req.query.item_id) {
    params.push(toInt(req.query.item_id, 'товар'));
    conditions.push(`item_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM v_stock_overview ${where} ORDER BY quantity DESC, item_name, warehouse_name`,
    params
  );
  res.json(rows);
}));

// GET /api/stock/totals?min=100   сумарні залишки товарів по всіх складах
// (GROUP BY + HAVING + SUM; у ЛР №5 поріг 100)
router.get('/totals', asyncHandler(async (req, res) => {
  const min = req.query.min === undefined ? 0 : toInt(req.query.min, 'мінімум', { min: 0 });
  const { rows } = await query(
    `SELECT i.item_id, i.item_name, i.unit, ic.category_name,
            SUM(s.quantity) AS total_quantity
     FROM stock s
     JOIN item i           ON i.item_id = s.item_id
     JOIN item_category ic ON ic.category_id = i.category_id
     GROUP BY i.item_id, ic.category_name
     HAVING SUM(s.quantity) > $1
     ORDER BY total_quantity DESC, i.item_name`,
    [min]
  );
  res.json(rows);
}));

// PUT /api/stock   ручне виправлення залишку (інвентаризація): { warehouse_id, item_id, quantity }
router.put('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const warehouseId = toInt(body.warehouse_id, 'склад');
  const itemId = toInt(body.item_id, 'товар');
  const quantity = toInt(body.quantity, 'кількість', { min: 0, max: 100000000 });

  const w = await query('SELECT 1 FROM warehouse WHERE warehouse_id = $1', [warehouseId]);
  if (!w.rows.length) throw new HttpError(404, 'Склад не знайдено');
  const i = await query('SELECT 1 FROM item WHERE item_id = $1', [itemId]);
  if (!i.rows.length) throw new HttpError(404, 'Товар не знайдено');

  const { rows } = await query(
    `INSERT INTO stock (warehouse_id, item_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (warehouse_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity
     RETURNING warehouse_id, item_id, quantity`,
    [warehouseId, itemId, quantity]
  );
  res.json(rows[0]);
}));

export default router;
