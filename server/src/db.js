// Підключення до PostgreSQL. Один пул з'єднань на весь сервер.
import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// За замовчуванням pg повертає DATE як JS-об'єкт Date, і через часовий пояс
// дата може "з'їхати" на день. Віддаємо DATE рядком 'YYYY-MM-DD'.
types.setTypeParser(1082, (value) => value);
// COUNT/SUM у PostgreSQL мають тип bigint/numeric, а pg віддає їх рядками.
// Наші числа невеликі, тому перетворюємо в звичайні числа.
types.setTypeParser(20, (value) => parseInt(value, 10));
types.setTypeParser(1700, (value) => parseFloat(value));

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'helppulse',
});

/** Звичайний запит: query('SELECT ... WHERE id = $1', [id]) */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Виконує кілька запитів як ОДНУ транзакцію (BEGIN ... COMMIT).
 * Якщо всередині виникає помилка, робиться ROLLBACK, і база не змінюється.
 *
 *   await withTransaction(async (client) => {
 *     await client.query('UPDATE ...');
 *     await client.query('INSERT ...');
 *   });
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
