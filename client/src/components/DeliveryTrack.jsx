// Трекер доставки: створено → зібрано → в дорозі → доставлено.
// Це головний візуальний елемент HelpPulse, він же використовується на сторінці відстеження.
const STEPS = ['створено', 'зібрано', 'в дорозі', 'доставлено'];

export default function DeliveryTrack({ status }) {
  if (status === 'скасовано') {
    return <div className="track--cancelled" role="status">Доставку скасовано</div>;
  }
  const current = STEPS.indexOf(status);
  return (
    <ol className="track" aria-label={`Статус доставки: ${status}`}>
      {STEPS.map((step, i) => {
        const cls = i < current ? 'done' : i === current ? `current${step === 'в дорозі' ? ' is-moving' : ''}` : '';
        return (
          <li key={step} className={`track__step ${cls}`} aria-current={i === current ? 'step' : undefined}>
            <span className="track__dot" aria-hidden="true" />
            {step}
          </li>
        );
      })}
    </ol>
  );
}
