// Єдині екрани стану: завантаження, помилка, порожньо.
export function Loading({ lines = 3 }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="sr-only" style={{ position: 'absolute', left: -9999 }}>Завантаження…</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 20, width: `${90 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <strong>Не вдалося завантажити дані</strong>
      <span>{error?.message}</span>
      {onRetry && <button type="button" className="btn btn--ghost btn--small" onClick={onRetry}>Спробувати ще раз</button>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="state">{children}</div>;
}
