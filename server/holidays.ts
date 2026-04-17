/**
 * Feriados Nacionais Brasileiros — módulo servidor
 * Espelha a lógica do frontend para validação defensiva no backend.
 */

function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function getBrazilianHolidays(year: number): Set<string> {
  const h = new Set<string>();
  const add = (month: number, day: number) => h.add(fmtDate(new Date(year, month - 1, day)));
  const addRel = (base: Date, offset: number) => h.add(fmtDate(addDays(base, offset)));

  // Fixos
  add(1, 1); add(4, 21); add(5, 1); add(9, 7);
  add(10, 12); add(11, 2); add(11, 15); add(11, 20); add(12, 25);

  // Móveis
  const easter = getEaster(year);
  addRel(easter, -48); addRel(easter, -47);
  addRel(easter, -2); addRel(easter, 0); addRel(easter, 60);

  return h;
}

/**
 * Verifica se uma string "YYYY-MM-DD" é feriado nacional.
 */
export function isBrazilianHoliday(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  return getBrazilianHolidays(year).has(dateStr);
}
