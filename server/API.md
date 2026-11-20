# HelpPulse: REST API

Базова адреса: `http://localhost:5000/api`. Дані передаються у форматі JSON.
Помилки повертаються як `{ "error": "пояснення українською" }` з кодами 400 (некоректні дані),
404 (не знайдено), 409 (конфлікт: дубль, нестача товару, неможливий перехід статусу).

## Довідники та прості сутності (стандартний набір)

Для кожного ресурсу: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.

| Ресурс | Таблиця | Примітки |
|---|---|---|
| `/categories` | item_category | |
| `/items` | item | `?category=2`, у списку є назва категорії |
| `/requesters` | requester | тип: людина / лікарня / організація |
| `/donors` | donor | тип: особа / компанія / фонд |
| `/warehouses` | warehouse | |
| `/volunteers` | volunteer | `has_vehicle`: Y / N |
| `/routes` | route | |

Видалення запису, на який посилаються інші таблиці, повертає 409.

## Процеси (кожна зміна кількох таблиць виконується однією транзакцією)

| Метод і адреса | Що робить |
|---|---|
| `GET /requests?active=true&state=...` | список заявок (`v_requests_overview`), запит №1 з ЛР №5 |
| `GET /requests/:id` | заявка з переліком товарів |
| `POST /requests` | **транзакція:** (новий заявник) → заявка → позиції |
| `PATCH /requests/:id` | зміна статусу / пріоритету (завершену змінювати не можна) |
| `GET /donations`, `GET /donations/:id` | пожертви з підсумками / з товарами |
| `POST /donations` | **транзакція:** (донор) → пожертва → позиції → **збільшення залишків** |
| `GET /kits`, `GET /kits/:id` | набори допомоги |
| `POST /kits` | **транзакція:** перевірка залишків → **списання зі складу** → набір → статус заявки; нестача → 409 і ROLLBACK |
| `GET /deliveries?active=true&status=...` | доставки (`v_deliveries_full`, `v_active_deliveries`) |
| `GET /deliveries/:id` | доставка з вмістом набору та відгуком |
| `POST /deliveries` | призначення волонтера й маршруту для набору |
| `PATCH /deliveries/:id/status` | створено → зібрано → в дорозі; «скасовано» повертає товар на склад |
| `PATCH /deliveries/:id/note` | примітка волонтера (поле з ЛР №6) |
| `POST /deliveries/:id/complete` | **транзакція ЛР №7:** статус «доставлено» + `actual_date` + статус заявки + відгук |
| `GET /stock`, `GET /stock/totals?min=100` | залишки / сумарні залишки (GROUP BY + HAVING) |
| `PUT /stock` | ручне виправлення залишку (інвентаризація) |
| `GET /feedback`, `GET /feedback/summary` | відгуки / середня оцінка й розподіл |
| `POST /feedback` | відгук на доставлену доставку (один на доставку) |
| `GET /track/:requestId` | публічне відстеження заявки (без контактів) |

## Звіти (`/reports/...`)

| Адреса | Основа |
|---|---|
| `summary` | лічильники для головної та огляду |
| `regions` | ЛР №5 (запит 5), ЛР №7 (завд. 2): виконані доставки за регіонами, регіон-лідер |
| `volunteers` | ЛР №5 (запит 3), ЛР №6: доставки й середня оцінка волонтера |
| `requests-by-state`, `deliveries-by-status` | розподіл за статусами |
| `deliveries-without-feedback` | ЛР №6: LEFT JOIN, доставки без відгуку |
| `donations-by-donor` | внесок донорів |

## Приклади тіл запитів

Створення заявки:
```json
{
  "requester": { "requester_name": "Олена", "requester_type": "людина",
                 "phone": "+380991112233", "address": "Київ, вул. Хрещатик, 10", "region": "Київська" },
  "priority": "високий",
  "items": [ { "item_id": 1, "quantity": 10 }, { "item_id": 3, "quantity": 4 } ]
}
```

Пожертва:
```json
{
  "donor": { "donor_name": "ТОВ Добро", "donor_type": "компанія", "email": "info@dobro.ua" },
  "warehouse_id": 1,
  "items": [ { "item_id": 1, "quantity": 30 } ]
}
```

Формування набору (без `items`: за позиціями заявки):
```json
{ "request_id": 3, "warehouse_id": 3 }
```

Завершення доставки з відгуком:
```json
{ "rating": 5, "review_text": "Усе чудово, дякуємо!" }
```
