// Точка входу бекенда HelpPulse.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import itemsRouter from './routes/items.js';
import requestsRouter from './routes/requests.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Перевірка, що сервер і база даних працюють
app.get('/api/health', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT NOW() AS server_time, current_database() AS db');
    res.json({ status: 'ok', database: rows[0].db, serverTime: rows[0].server_time });
  } catch (err) {
    next(err);
  }
});

app.use('/api', itemsRouter);
app.use('/api/requests', requestsRouter);

// Невідомий маршрут
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

// Єдиний обробник помилок: переводить помилки PostgreSQL у зрозумілі відповіді
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === '23503') return res.status(409).json({ error: 'Порушення зв’язку: пов’язаний запис не існує або використовується' });
  if (err.code === '23505') return res.status(409).json({ error: 'Такий запис уже існує' });
  if (err.code === '23514') return res.status(400).json({ error: 'Значення не відповідає обмеженню бази даних' });
  if (err.code === '23502') return res.status(400).json({ error: 'Не заповнено обов’язкове поле' });
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Внутрішня помилка сервера' });
});

app.listen(PORT, () => {
  console.log(`HelpPulse сервер запущено: http://localhost:${PORT}`);
});
