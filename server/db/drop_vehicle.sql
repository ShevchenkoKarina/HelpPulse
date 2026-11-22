-- Одноразова міграція: прибирає поле «наявність авто» з таблиці волонтерів.
ALTER TABLE volunteer DROP CONSTRAINT IF EXISTS chk_has_vehicle;
ALTER TABLE volunteer DROP COLUMN IF EXISTS has_vehicle;
