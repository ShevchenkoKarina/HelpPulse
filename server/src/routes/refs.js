// Прості сутності з типовими операціями (список, перегляд, створення, зміна, видалення).
// Описуємо лише колонки, а маршрути створює crud().
import { Router } from 'express';
import { col, crud } from '../crud.js';

const router = Router();

// Категорії товарів
router.use('/categories', crud({
  table: 'item_category',
  pk: 'category_id',
  orderBy: 'category_name',
  columns: { category_name: col.str('Назва категорії', { max: 100 }) },
}));

// Товари (список із назвою категорії; фільтр ?category=2)
router.use('/items', crud({
  table: 'item',
  pk: 'item_id',
  columns: {
    category_id: col.int('Категорія'),
    item_name: col.str('Назва товару', { max: 150 }),
    unit: col.str('Одиниця виміру', { max: 20, dbDefault: true }),
  },
  listQuery: (req) => {
    const params = [];
    let where = '';
    if (req.query.category) {
      params.push(Number(req.query.category));
      where = 'WHERE i.category_id = $1';
    }
    return {
      text: `SELECT i.item_id, i.item_name, i.unit, i.category_id, ic.category_name
             FROM item i
             JOIN item_category ic ON ic.category_id = i.category_id
             ${where}
             ORDER BY ic.category_name, i.item_name`,
      params,
    };
  },
}));

// Заявники
router.use('/requesters', crud({
  table: 'requester',
  pk: 'requester_id',
  orderBy: 'requester_name',
  columns: {
    requester_name: col.str('Назва / ПІБ', { max: 150 }),
    requester_type: col.enum('Тип заявника', ['людина', 'лікарня', 'організація']),
    phone: col.str('Телефон', { max: 20, required: false }),
    address: col.str('Адреса', { max: 250 }),
    region: col.str('Область', { max: 100 }),
  },
}));

// Донори
router.use('/donors', crud({
  table: 'donor',
  pk: 'donor_id',
  orderBy: 'donor_name',
  columns: {
    donor_name: col.str('Назва / ПІБ', { max: 150 }),
    donor_type: col.enum('Тип донора', ['особа', 'компанія', 'фонд']),
    phone: col.str('Телефон', { max: 20, required: false }),
    email: col.str('Email', { max: 100, required: false }),
  },
}));

// Склади
router.use('/warehouses', crud({
  table: 'warehouse',
  pk: 'warehouse_id',
  orderBy: 'warehouse_name',
  columns: {
    warehouse_name: col.str('Назва складу', { max: 100 }),
    address: col.str('Адреса', { max: 250 }),
    phone: col.str('Телефон', { max: 20, required: false }),
  },
}));

// Волонтери
router.use('/volunteers', crud({
  table: 'volunteer',
  pk: 'volunteer_id',
  orderBy: 'volunteer_name',
  columns: {
    volunteer_name: col.str('ПІБ', { max: 150 }),
    phone: col.str('Телефон', { max: 20 }),
    has_vehicle: col.enum('Наявність авто', ['Y', 'N'], { required: false }),
    region: col.str('Область', { max: 100, required: false }),
  },
}));

// Маршрути
router.use('/routes', crud({
  table: 'route',
  pk: 'route_id',
  orderBy: 'route_id',
  columns: {
    start_point: col.str('Початок маршруту', { max: 200 }),
    end_point: col.str('Кінець маршруту', { max: 200 }),
    distance_km: col.num('Відстань, км'),
  },
}));

export default router;
