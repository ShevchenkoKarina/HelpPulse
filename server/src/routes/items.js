// Довідники: категорії та товари.
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/categories
router.get('/categories', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT category_id, category_name FROM item_category ORDER BY category_name'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/items            усі товари
// GET /api/items?category=2 лише товари однієї категорії
router.get('/items', async (req, res, next) => {
  try {
    const params = [];
    let where = '';
    if (req.query.category) {
      params.push(Number(req.query.category));
      where = 'WHERE i.category_id = $1';
    }
    const { rows } = await query(
      `SELECT i.item_id, i.item_name, i.unit, i.category_id, ic.category_name
       FROM item i
       JOIN item_category ic ON ic.category_id = i.category_id
       ${where}
       ORDER BY ic.category_name, i.item_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
