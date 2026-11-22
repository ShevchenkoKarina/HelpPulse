
-- HelpPulse: представлення (VIEW)
-- Сайт читає складні вибірки з цих представлень як зі звичайних таблиць.


--  активні доставки (створено, зібрано, в дорозі)
CREATE OR REPLACE VIEW v_active_deliveries AS
SELECT d.delivery_id,
       hr.request_id,
       r.requester_name,
       r.region,
       v.volunteer_name,
       v.phone AS volunteer_phone,
       w.warehouse_name,
       rt.start_point,
       rt.end_point,
       ds.status_name,
       d.planned_date,
       d.volunteer_note
FROM delivery d
JOIN aid_kit         k  ON k.kit_id        = d.kit_id
JOIN help_request    hr ON hr.request_id   = k.request_id
JOIN requester       r  ON r.requester_id  = hr.requester_id
JOIN volunteer       v  ON v.volunteer_id  = d.volunteer_id
JOIN route           rt ON rt.route_id     = d.route_id
JOIN warehouse       w  ON w.warehouse_id  = k.warehouse_id
JOIN delivery_status ds ON ds.status_id    = d.status_id
WHERE ds.status_name IN ('створено', 'зібрано', 'в дорозі');

--  усі доставки з повним контекстом (статус заявки,
-- отримувач, волонтер, маршрут, склад, статус доставки)
CREATE OR REPLACE VIEW v_deliveries_full AS
SELECT d.delivery_id,
       hr.request_id,
       hr.request_state,
       r.requester_id,
       r.requester_name,
       r.region,
       v.volunteer_id,
       v.volunteer_name,
       rt.start_point,
       rt.end_point,
       rt.distance_km,
       w.warehouse_name,
       ds.status_id,
       ds.status_name,
       d.planned_date,
       d.actual_date,
       d.volunteer_note
FROM delivery d
JOIN aid_kit         k  ON k.kit_id        = d.kit_id
JOIN help_request    hr ON hr.request_id   = k.request_id
JOIN requester       r  ON r.requester_id  = hr.requester_id
JOIN volunteer       v  ON v.volunteer_id  = d.volunteer_id
JOIN route           rt ON rt.route_id     = d.route_id
JOIN warehouse       w  ON w.warehouse_id  = k.warehouse_id
JOIN delivery_status ds ON ds.status_id    = d.status_id;

--  залишки товарів на складах
CREATE OR REPLACE VIEW v_stock_overview AS
SELECT w.warehouse_id,
       w.warehouse_name,
       i.item_id,
       ic.category_name,
       i.item_name,
       i.unit,
       s.quantity
FROM stock s
JOIN warehouse     w  ON w.warehouse_id = s.warehouse_id
JOIN item          i  ON i.item_id      = s.item_id
JOIN item_category ic ON ic.category_id = i.category_id;

--  кількість виконаних доставок за регіонами
CREATE OR REPLACE VIEW v_region_delivered AS
SELECT r.region,
       COUNT(d.delivery_id) AS delivered_count
FROM delivery d
JOIN delivery_status ds ON ds.status_id   = d.status_id
JOIN aid_kit         k  ON k.kit_id       = d.kit_id
JOIN help_request    hr ON hr.request_id  = k.request_id
JOIN requester       r  ON r.requester_id = hr.requester_id
WHERE ds.status_name = 'доставлено'
GROUP BY r.region;

--  відгуки разом з отримувачем, волонтером і доставкою
CREATE OR REPLACE VIEW v_feedback_full AS
SELECT f.feedback_id,
       f.delivery_id,
       r.requester_id,
       r.requester_name,
       r.region,
       v.volunteer_id,
       v.volunteer_name,
       d.actual_date,
       f.rating,
       f.review_text,
       f.created_at AS feedback_date
FROM feedback f
JOIN delivery  d ON d.delivery_id  = f.delivery_id
JOIN requester r ON r.requester_id = f.requester_id
JOIN volunteer v ON v.volunteer_id = d.volunteer_id;

-- Заявки зі зведенням: кількість позицій і загальна потрібна кількість
CREATE OR REPLACE VIEW v_requests_overview AS
SELECT hr.request_id,
       hr.created_at,
       hr.priority,
       hr.request_state,
       r.requester_id,
       r.requester_name,
       r.requester_type,
       r.region,
       COUNT(ri.item_id)                  AS items_count,
       COALESCE(SUM(ri.quantity_needed),0) AS total_needed
FROM help_request hr
JOIN requester r ON r.requester_id = hr.requester_id
LEFT JOIN request_item ri ON ri.request_id = hr.request_id
GROUP BY hr.request_id, r.requester_id;
