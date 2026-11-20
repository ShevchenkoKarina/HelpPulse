import { useId } from 'react';
import { Star } from 'lucide-react';

/** Вибір оцінки від 1 до 5 зірок (працює з клавіатури: стрілки між варіантами). */
export default function StarInput({ legend, value, onChange, error }) {
  const id = useId();
  const labels = ['Дуже погано', 'Погано', 'Нормально', 'Добре', 'Відмінно'];
  return (
    <fieldset className="field">
      <legend className="field__label" style={{ marginBottom: 6 }}>{legend}</legend>
      <div className="star-input">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= value ? 'on' : ''} title={labels[n - 1]}>
            <input type="radio" name={`rating-${id}`} value={n} checked={value === n} onChange={() => onChange(n)} />
            <Star size={30} fill="currentColor" aria-hidden="true" />
            <span className="sr-only">{n} з 5: {labels[n - 1]}</span>
          </label>
        ))}
      </div>
      {value > 0 && <span className="field__hint">{labels[value - 1]}</span>}
      {error && <span className="field__error">{error}</span>}
    </fieldset>
  );
}
