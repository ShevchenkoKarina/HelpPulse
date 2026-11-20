import { cloneElement, useId } from 'react';

/**
 * Поле форми: підпис, підказка, повідомлення про помилку.
 * Підпис і помилка прив'язуються до елемента для екранних читачів (aria).
 * Використання: <Field label="Ім’я" error={errors.name}><input className="input" .../></Field>
 */
export default function Field({ label, hint, error, optional = false, children }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}{optional && <span className="field__optional"> (необов’язково)</span>}
      </label>
      {cloneElement(children, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {hint && <span className="field__hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="field__error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}
