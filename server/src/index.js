// Точка входу бекенда HelpPulse.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query } from './db.js';
import refsRouter from './routes/refs.js';
import requestsRouter from './routes/requests.js';
import donationsRouter from './routes/donations.js';
import kitsRouter from './routes/kits.js';
import deliveriesRouter from './routes/deliveries.js';
import stockRouter from './routes/stock.js';
import feedbackRouter from './routes/feedback.js';
import trackRouter from './routes/track.js';
import reportsRouter from './routes/reports.js';
import authRouter, { guard } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Перевірка, що сервер і база даних працюють
app.set('trust proxy', false);
app.get('/api/health', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT NOW() AS server_time, current_database() AS db');
    res.json({ status: 'ok', database: rows[0].db, serverTime: rows[0].server_time });
  } catch (err) {
    next(err);
  }
});

// Захист: усе, що не в списку публічних маршрутів, вимагає входу координатора
app.use('/api', guard);
app.use('/api/auth', authRouter);

// Довідники та прості сутності: categories, items, requesters, donors, warehouses, volunteers, routes
app.use('/api', refsRouter);
// Процеси предметної області
app.use('/api/requests', requestsRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/kits', kitsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/track', trackRouter);
app.use('/api/reports', reportsRouter);

// Невідомий маршрут
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

// Єдиний обробник помилок: переводить помилки PostgreSQL у зрозумілі відповіді
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === '23503') return res.status(409).json({ error: 'Операція порушує зв’язки між таблицями: запис використовується в інших даних або пов’язаного запису не існує' });
  if (err.code === '23505') return res.status(409).json({ error: 'Такий запис уже існує' });
  if (err.code === '23514') return res.status(400).json({ error: 'Значення не відповідає обмеженню бази даних' });
  if (err.code === '23502') return res.status(400).json({ error: 'Не заповнено обов’язкове поле' });
  res.status(err.status || 500).json({
    error: err.status ? err.message : 'Внутрішня помилка сервера',
    // Під час розробки показуємо причину помилки; у production ховаємо
    detail: err.status || process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`HelpPulse сервер запущено: http://localhost:${PORT}`);
});
