const dateFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
const numFmt = new Intl.NumberFormat('uk-UA');

/** '2026-11-06' -> '6 листопада 2026 р.' (дати з бекенда приходять як РРРР-ММ-ДД) */
export function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

/** '2026-11-06' -> '06.11.2026' (для таблиць) */
export function formatDateShort(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export const formatNumber = (n) => numFmt.format(n ?? 0);

/** Правильна форма слова: plural(5, ['заявка', 'заявки', 'заявок']) -> 'заявок' */
export function plural(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
