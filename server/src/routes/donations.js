// Пожертви: перегляд і створення. Створення збільшує залишки на складі (транзакція).
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import {
  HttpError, asyncHandler, assertItemsExist, idParam, parseItems, toDate, toEnum, toInt, toStr,
} from '../utils.js';

const router = Router();
const DONOR_TYPES = ['особа', 'компанія', 'фонд'];

// GET /api/donations   список пожертв із донором, складом та підсумками
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT dn.donation_id, dn.donation_date,
            d.donor_id, d.donor_name, d.donor_type,
            w.warehouse_id, w.warehouse_name,
            COUNT(di.item_id)                   AS items_count,
            COALESCE(SUM(di.quantity), 0)       AS total_quantity
     FROM donation dn
     JOIN donor d     ON d.donor_id = dn.donor_id
     JOIN warehouse w ON w.warehouse_id = dn.warehouse_id
     LEFT JOIN donation_item di ON di.donation_id = dn.donation_id
     GROUP BY dn.donation_id, d.donor_id, w.warehouse_id
     ORDER BY dn.donation_date DESC, dn.donation_id DESC`
  );
  res.json(rows);
}));

// GET /api/donations/:id   пожертва з переліком товарів
router.get('/:id', asyncHandler(async (req, res) => {
  const id = idParam(req, 'номер пожертви');
  const head = await query(
    `SELECT dn.donation_id, dn.donation_date,
            d.donor_id, d.donor_name, d.donor_type,
            w.warehouse_id, w.warehouse_name
     FROM donation dn
     JOIN donor d     ON d.donor_id = dn.donor_id
     JOIN warehouse w ON w.warehouse_id = dn.warehouse_id
     WHERE dn.donation_id = $1`,
    [id]
  );
  if (!head.rows.length) throw new HttpError(404, 'Пожертву не знайдено');

  const items = await query(
    `SELECT i.item_id, i.item_name, i.unit, ic.category_name, di.quantity
     FROM donation_item di
     JOIN item i           ON i.item_id = di.item_id
     JOIN item_category ic ON ic.category_id = i.category_id
     WHERE di.donation_id = $1
     ORDER BY ic.category_name, i.item_name`,
    [id]
  );
  res.json({ ...head.rows[0], items: items.rows });
}));

// POST /api/donations   ТРАНЗАКЦІЯ: (донор) -> пожертва -> позиції -> збільшення залишків на складі.
// Тіло: { donor_id }  АБО  { donor: { donor_name, donor_type, phone, email } },
//       warehouse_id, donation_date (необов'язково), items: [{ item_id, quantity }]
// Якщо донор із таким email уже є, використовується наявний запис.
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const items = parseItems(body.items, 'Пожертва');
  const warehouseId = toInt(body.warehouse_id, 'склад');
  const date = toDate(body.donation_date, 'Дата пожертви', { required: false });

  const result = await withTransaction(async (client) => {
    const wh = await client.query('SELECT 1 FROM warehouse WHERE warehouse_id = $1', [warehouseId]);
    if (!wh.rows.length) throw new HttpError(404, 'Склад не знайдено');
    await assertItemsExist(client, items);

    let donorId;
    if (body.donor_id !== undefined) {
      donorId = toInt(body.donor_id, 'донор');
      const found = await client.query('SELECT 1 FROM donor WHERE donor_id = $1', [donorId]);
      if (!found.rows.length) throw new HttpError(404, 'Донора не знайдено');
    } else if (body.donor) {
      const d = body.donor;
      const email = toStr(d.email, 'Email', { max: 100, required: false });
      const existing = email
        ? await client.query('SELECT donor_id FROM donor WHERE email = $1', [email])
        : { rows: [] };
      if (existing.rows.length) {
        donorId = existing.rows[0].donor_id;
      } else {
        const created = await client.query(
          `INSERT INTO donor (donor_name, donor_type, phone, email)
           VALUES ($1, $2, $3, $4) RETURNING donor_id`,
          [
            toStr(d.donor_name, 'Назва / ПІБ', { max: 150 }),
            toEnum(d.donor_type, 'Тип донора', DONOR_TYPES),
            toStr(d.phone, 'Телефон', { max: 20, required: false }),
            email,
          ]
        );
        donorId = created.rows[0].donor_id;
      }
    } else {
      throw new HttpError(400, 'Потрібно вказати донора (donor_id або donor)');
    }

    const donation = await client.query(
      `INSERT INTO donation (donor_id, warehouse_id, donation_date)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE))
       RETURNING donation_id, donation_date`,
      [donorId, warehouseId, date]
    );
    const donationId = donation.rows[0].donation_id;

    for (const it of items) {
      await client.query(
        'INSERT INTO donation_item (donation_id, item_id, quantity) VALUES ($1, $2, $3)',
        [donationId, it.item_id, it.quantity]
      );
      // Додаємо до залишку; якщо такого товару на складі ще не було, створюємо рядок
      await client.query(
        `INSERT INTO stock (warehouse_id, item_id, quantity) VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, item_id)
         DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity`,
        [warehouseId, it.item_id, it.quantity]
      );
    }

    return { ...donation.rows[0], donor_id: donorId, warehouse_id: warehouseId, items_count: items.length };
  });

  res.status(201).json(result);
}));

export default router;
