import { Plus, Trash2 } from 'lucide-react';

let counter = 0;
/** Порожній рядок списку (key потрібен React, щоб не плутати рядки при видаленні). */
export const newRow = () => ({ key: ++counter, item_id: '', quantity: '' });

/**
 * Перевірка списку: порожні рядки ігноруються, напівзаповнені дають помилку.
 * Повертає { items, error } де items = [{ item_id, quantity }].
 */
export function readRows(rows) {
  const filled = rows.filter((r) => r.item_id || r.quantity);
  if (filled.length === 0) return { items: [], error: 'Додайте хоча б одну позицію' };
  const bad = filled.some((r) => !r.item_id || !(Number(r.quantity) >= 1) || !Number.isInteger(Number(r.quantity)));
  if (bad) return { items: [], error: 'У кожному рядку виберіть товар і вкажіть кількість: ціле число від 1' };
  return { items: filled.map((r) => ({ item_id: Number(r.item_id), quantity: Number(r.quantity) })), error: null };
}

/** Список «товар + кількість» з можливістю додавати й видаляти рядки. */
export default function ItemsPicker({ catalog, rows, onChange, error, showRowErrors }) {
  const used = new Set(rows.map((r) => String(r.item_id)).filter(Boolean));
  const groups = {};
  (catalog || []).forEach((i) => { (groups[i.category_name] ||= []).push(i); });

  const update = (key, patch) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key) => onChange(rows.length > 1 ? rows.filter((r) => r.key !== key) : [newRow()]);

  return (
    <div className="items">
      {rows.map((r, idx) => {
        const touched = showRowErrors && (r.item_id || r.quantity);
        const badItem = touched && !r.item_id;
        const badQty = touched && !(Number(r.quantity) >= 1 && Number.isInteger(Number(r.quantity)));
        return (
          <div className="items-row" key={r.key}>
            <div>
              <label className="sr-only" htmlFor={`item-${r.key}`}>Товар {idx + 1}</label>
              <select
                id={`item-${r.key}`} className="input select" value={r.item_id}
                aria-invalid={badItem ? 'true' : undefined}
                onChange={(e) => update(r.key, { item_id: e.target.value })}
              >
                <option value="">Оберіть товар…</option>
                {Object.entries(groups).map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map((i) => (
                      <option key={i.item_id} value={i.item_id} disabled={used.has(String(i.item_id)) && String(i.item_id) !== String(r.item_id)}>
                        {i.item_name}, {i.unit}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="qty">
              <label className="sr-only" htmlFor={`qty-${r.key}`}>Кількість для позиції {idx + 1}</label>
              <input
                id={`qty-${r.key}`} className="input" type="number" min="1" step="1" inputMode="numeric"
                placeholder="Кількість" value={r.quantity}
                aria-invalid={badQty ? 'true' : undefined}
                onChange={(e) => update(r.key, { quantity: e.target.value })}
              />
            </div>
            <button
              type="button" className="btn btn--ghost btn--icon" onClick={() => remove(r.key)}
              aria-label={`Прибрати позицію ${idx + 1}`}
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <div>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => onChange([...rows, newRow()])}>
          <Plus size={18} aria-hidden="true" /> Додати ще позицію
        </button>
      </div>
      {error && <span className="field__error" role="alert">{error}</span>}
    </div>
  );
}
