import { useId } from 'react';

/** Вибір одного варіанта з карток. options: [{ value, title, desc, danger }] */
export default function RadioCards({ legend, name, value, onChange, options, error }) {
  const id = useId();
  return (
    <fieldset className="field">
      <legend className="field__label" style={{ marginBottom: 6 }}>{legend}</legend>
      <div className="radio-cards">
        {options.map((o) => (
          <label key={o.value} className={`radio-card${o.danger ? ' radio-card--danger' : ''}`}>
            <input
              type="radio" name={`${name}-${id}`} value={o.value}
              checked={value === o.value} onChange={() => onChange(o.value)}
            />
            <span className="radio-card__body">
              <span className="radio-card__title">{o.title}</span>
              {o.desc && <span className="radio-card__desc">{o.desc}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <span className="field__error">{error}</span>}
    </fieldset>
  );
}
