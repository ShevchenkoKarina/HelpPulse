# HelpPulse
<img width="2560" height="1280" alt="image" src="https://github.com/user-attachments/assets/044fd3c2-cc20-43a8-9b9d-bd85111db656" />

Веб-платформа для організації доставки донатів та гуманітарної допомоги (курсова робота з дисципліни «Організація баз даних», варіант 24).

Отримувачі подають заявки й відстежують їх, донори передають товари, а координатор керує складами, наборами та доставками. Усі дані зберігаються в **PostgreSQL**, а застосунок працює з базою через SQL-запити й транзакції.

## Що вміє сайт

| Для кого | Можливості |
|---|---|
| Отримувач | подати заявку, відстежити доставку за номером, залишити відгук |
| Донор | передати пожертву на склад (залишки зростають автоматично) |
| Координатор (вхід за паролем) | заявки, формування наборів зі списанням зі складу, доставки, склад, пожертви, волонтери, довідники, відгуки, звіти |

## Технології

- **База даних:** PostgreSQL (17 таблиць, 6 представлень, транзакції, `SELECT ... FOR UPDATE`)
- **Бекенд:** Node.js, Express, `pg`
- **Фронтенд:** React 18, Vite, React Router
- **Запуск:** локально або через Docker Compose

## Структура

```
HelpPulse/
├── server/            бекенд (Express) і SQL-скрипти
│   ├── db/            01_schema.sql, 02_seed.sql, 03_views.sql
│   ├── src/           код сервера (routes/ — маршрути API)
│   └── API.md         опис усіх запитів API
├── client/            фронтенд (React)
│   └── src/           сторінки, компоненти, стилі
├── docker-compose.yml  запуск бази, сервера й сайту разом
└── .env.example        шаблон налаштувань для Docker
```

## База даних

Таблиці: `item_category`, `item`, `requester`, `help_request`, `request_item`, `donor`, `warehouse`, `donation`, `donation_item`, `stock`, `aid_kit`, `kit_item`, `volunteer`, `route`, `delivery_status`, `delivery`, `feedback`.

Представлення: `v_active_deliveries`, `v_deliveries_full`, `v_stock_overview`, `v_region_delivered`, `v_feedback_full`, `v_requests_overview`.

Скрипти запускаються по черзі: `01_schema.sql` (створює таблиці; повторний запуск видаляє й створює їх наново), `02_seed.sql` (початкові дані), `03_views.sql` (представлення).

## Запуск без Docker

Потрібно: **Node.js 20+** і **PostgreSQL 15+**.

**1. База даних.** Створіть базу `helppulse` (у pgAdmin: правою кнопкою на Databases → Create → Database). Відкрийте для неї Query Tool і виконайте по черзі вміст файлів `server/db/01_schema.sql`, `02_seed.sql`, `03_views.sql`.
Через консоль те саме: 
```
psql -U postgres -c "CREATE DATABASE helppulse"
psql -U postgres -d helppulse -f server/db/01_schema.sql
psql -U postgres -d helppulse -f server/db/02_seed.sql
psql -U postgres -d helppulse -f server/db/03_views.sql
```

**2. Сервер.**
```
cd server
copy .env.example .env      (macOS/Linux: cp .env.example .env)
```
Відкрийте `server/.env` і впишіть пароль свого PostgreSQL у `DB_PASSWORD`. Потім:
```
npm install
npm run dev
```
Перевірка: `http://localhost:5000/api/health` має показати `{"status":"ok", ...}`.

**3. Сайт** (у другому терміналі).
```
cd client
npm install
npm run dev
```
Сайт: `http://localhost:5173`.

## Запуск через Docker

Потрібен Docker Desktop. База створюється й заповнюється автоматично.
```
copy .env.example .env      (macOS/Linux: cp .env.example .env)
docker compose up --build
```
Сайт: `http://localhost:8080`, API: `http://localhost:5000/api`. Щоб почати з чистої бази: `docker compose down -v`.

## Вхід координатора

Кнопка «Керування» у верхньому меню відкриває вікно з паролем. Пароль за замовчуванням: **1234**. Змінити його можна рядком `ADMIN_PASSWORD=...` у `server/.env` (для Docker: у кореневому `.env`).

Публічні сторінки (заявка, відстеження, пожертва, відгуки) працюють без входу. Усі інші запити API захищені токеном координатора.

## Основні транзакції

- подання заявки: заявник → заявка → позиції;
- пожертва: донор → пожертва → позиції → збільшення залишків;
- формування набору: перевірка залишків → списання зі складу → набір → статус заявки (при нестачі повний відкат);
- завершення доставки: статус → дата → статус заявки → відгук;
- скасування доставки: статус → повернення товару на склад.

Докладніше про запити: [server/API.md](server/API.md).
