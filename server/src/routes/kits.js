// Набори допомоги. Створення набору списує товари зі складу (транзакція).
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { HttpError, asyncHandler, assertItemsExist, idParam, parseItems, toInt } from '../utils.js';

const router = Router();

// GET /api/kits   набори із заявкою, складом і доставкою
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT k.kit_id, k.created_at,
            hr.request_id, hr.request_state, r.requester_name, r.region,
            w.warehouse_id, w.warehouse_name,
            d.delivery_id,
            COUNT(ki.item_id)             AS items_count,
            COALESCE(SUM(ki.quantity), 0) AS total_quantity
     FROM aid_kit k
     JOIN help_request hr ON hr.request_id = k.request_id
     JOIN requester r     ON r.requester_id = hr.requester_id
     JOIN warehouse w     ON w.warehouse_id = k.warehouse_id
     LEFT JOIN delivery d ON d.kit_id = k.kit_id
     LEFT JOIN kit_item ki ON ki.kit_id = k.kit_id
     GROUP BY k.kit_id, hr.request_id, r.requester_id, w.warehouse_id, d.delivery_id
     ORDER BY k.created_at DESC, k.kit_id DESC`
  );
  res.json(rows);
}));

// GET /api/kits/:id   набір з вмістом
router.get('/:id', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер набору');
  const head = await query(
    `SELECT k.kit_id, k.created_at, hr.request_id, hr.request_state, r.requester_name, r.region,
            w.warehouse_id, w.warehouse_name, d.delivery_id
     FROM aid_kit k
     JOIN help_request hr ON hr.request_id = k.request_id
     JOIN requester r     ON r.requester_id = hr.requester_id
     JOIN warehouse w     ON w.warehouse_id = k.warehouse_id
     LEFT JOIN delivery d ON d.kit_id = k.kit_id
     WHERE k.kit_id = $1`,
    [id]
  );
  if (!head.rows.length) throw new HttpError(404, 'Набір не знайдено');

  const items = await query(
    `SELECT i.item_id, i.item_name, i.unit, ic.category_name, ki.quantity
     FROM kit_item ki
     JOIN item i           ON i.item_id = ki.item_id
     JOIN item_category ic ON ic.category_id = i.category_id
     WHERE ki.kit_id = $1
     ORDER BY ic.category_name, i.item_name`,
    [id]
  );
  res.json({ ...head.rows[0], items: items.rows });
}));

// POST /api/kits   ТРАНЗАКЦІЯ формування набору:
//   перевірка заявки -> перевірка залишків -> списання зі складу -> набір + його склад -> статус заявки.
// Тіло: { request_id, warehouse_id, items?: [{ item_id, quantity }] }
// Якщо items не вказано, набір формується за позиціями заявки.
// Якщо на складі не вистачає хоча б одного товару, жодних змін не буде (ROLLBACK).
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const requestId = toInt(body.request_id, 'заявка');
  const warehouseId = toInt(body.warehouse_id, 'склад');

  const result = await withTransaction(async (client) => {
    const hr = await client.query(
      'SELECT request_state FROM help_request WHERE request_id = $1 FOR UPDATE',
      [requestId]
    );
    if (!hr.rows.length) throw new HttpError(404, 'Заявку не знайдено');
    const state = hr.rows[0].request_state;
    if (['виконана', 'скасована'].includes(state)) {
      throw new HttpError(409, `Заявка має статус «${state}», набір для неї формувати не можна`);
    }

    const wh = await client.query('SELECT warehouse_name FROM warehouse WHERE warehouse_id = $1', [warehouseId]);
    if (!wh.rows.length) throw new HttpError(404, 'Склад не знайдено');
    const warehouseName = wh.rows[0].warehouse_name;

    let items;
    if (body.items !== undefined) {
      items = parseItems(body.items, 'Набір');
    } else {
      const ri = await client.query(
        'SELECT item_id, quantity_needed AS quantity FROM request_item WHERE request_id = $1 ORDER BY item_id',
        [requestId]
      );
      if (!ri.rows.length) throw new HttpError(409, 'У заявці немає позицій');
      items = ri.rows;
    }
    await assertItemsExist(client, items);

    // Блокуємо рядки залишків і перевіряємо, чи вистачає товару
    for (const it of items) {
      const s = await client.query(
        'SELECT quantity FROM stock WHERE warehouse_id = $1 AND item_id = $2 FOR UPDATE',
        [warehouseId, it.item_id]
      );
      const have = s.rows[0]?.quantity ?? 0;
      if (have < it.quantity) {
        const item = await client.query('SELECT item_name, unit FROM item WHERE item_id = $1', [it.item_id]);
        throw new HttpError(
          409,
          `Недостатньо товару «${item.rows[0].item_name}» на «${warehouseName}»: є ${have} ${item.rows[0].unit}, потрібно ${it.quantity}`
        );
      }
    }

    const kit = await client.query(
      'INSERT INTO aid_kit (request_id, warehouse_id) VALUES ($1, $2) RETURNING kit_id, created_at',
      [requestId, warehouseId]
    );
    const kitId = kit.rows[0].kit_id;

    for (const it of items) {
      await client.query(
        'UPDATE stock SET quantity = quantity - $1 WHERE warehouse_id = $2 AND item_id = $3',
        [it.quantity, warehouseId, it.item_id]
      );
      await client.query(
        'INSERT INTO kit_item (kit_id, item_id, quantity) VALUES ($1, $2, $3)',
        [kitId, it.item_id, it.quantity]
      );
    }

    if (state === 'нова') {
      await client.query(`UPDATE help_request SET request_state = 'в обробці' WHERE request_id = $1`, [requestId]);
    }

    return { ...kit.rows[0], request_id: requestId, warehouse_id: warehouseId, items_count: items.length };
  });

  res.status(201).json(result);
}));

export default router;
