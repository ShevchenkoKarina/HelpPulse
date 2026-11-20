import { Star } from 'lucide-react';

export default function Stars({ value, size = 18 }) {
  return (
    <span className="stars" role="img" aria-label={`Оцінка ${value} з 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? '' : 'off'} fill="currentColor" aria-hidden="true" />
      ))}
    </span>
  );
}
