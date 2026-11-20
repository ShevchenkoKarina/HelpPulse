import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Модальне вікно на основі <dialog>: Esc закриває, фокус повертається автоматично. */
export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    // Без очищення: при розмонтуванні <dialog> просто видаляється з DOM
    // (виклик close() у режимі StrictMode одразу б закрив вікно через onClose).
  }, []);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="dlg-title">
      <div className="dialog__head">
        <h2 id="dlg-title">{title}</h2>
        <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Закрити"><X size={20} aria-hidden="true" /></button>
      </div>
      <div className="dialog__body">{children}</div>
    </dialog>
  );
}
