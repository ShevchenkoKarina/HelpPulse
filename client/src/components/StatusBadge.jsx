// Статус завжди показується і кольором, і текстом.
const TONES = {
  // заявки
  'нова': 'blue', 'в обробці': 'amber', 'виконана': 'green', 'скасована': 'neutral',
  // доставки
  'створено': 'neutral', 'зібрано': 'blue', 'в дорозі': 'amber', 'доставлено': 'green', 'скасовано': 'red',
  // пріоритети
  'низький': 'neutral', 'середній': 'blue', 'високий': 'amber', 'критичний': 'red',
};

export default function StatusBadge({ value }) {
  const tone = TONES[value] || 'neutral';
  return <span className={`badge badge--${tone}`}>{value}</span>;
}
