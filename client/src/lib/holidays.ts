/**
 * Feriados Nacionais Brasileiros
 * Inclui feriados fixos e móveis (baseados na Páscoa) calculados por ano.
 * Referência: Lei nº 9.093/1995 e legislação complementar.
 */

/**
 * Calcula a data da Páscoa para um dado ano usando o algoritmo de Meeus/Jones/Butcher.
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Retorna um Set com todas as datas de feriados nacionais do ano no formato "YYYY-MM-DD".
 */
export function getBrazilianHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const addFixed = (month: number, day: number) => {
    holidays.add(fmt(new Date(year, month - 1, day)));
  };

  const addRelative = (base: Date, offsetDays: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offsetDays);
    holidays.add(fmt(d));
  };

  // ── Feriados Fixos ────────────────────────────────────────────────────────
  addFixed(1, 1);   // Confraternização Universal (Ano Novo)
  addFixed(4, 21);  // Tiradentes
  addFixed(5, 1);   // Dia do Trabalho
  addFixed(9, 7);   // Independência do Brasil
  addFixed(10, 12); // Nossa Senhora Aparecida (Padroeira do Brasil)
  addFixed(11, 2);  // Finados
  addFixed(11, 15); // Proclamação da República
  addFixed(11, 20); // Dia da Consciência Negra (Lei nº 14.759/2023)
  addFixed(12, 25); // Natal

  // ── Feriados Móveis (baseados na Páscoa) ─────────────────────────────────
  const easter = getEaster(year);

  addRelative(easter, -48); // Segunda-feira de Carnaval
  addRelative(easter, -47); // Terça-feira de Carnaval
  addRelative(easter, -2);  // Sexta-feira Santa (Paixão de Cristo)
  addRelative(easter, 0);   // Páscoa (domingo — geralmente não afeta dias úteis, mas incluído)
  addRelative(easter, 60);  // Corpus Christi

  return holidays;
}

/**
 * Verifica se uma data é feriado nacional brasileiro.
 * @param date - Objeto Date ou string "YYYY-MM-DD"
 */
export function isBrazilianHoliday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  const year = d.getFullYear();
  const holidays = getBrazilianHolidays(year);
  const fmt = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return holidays.has(fmt);
}

/**
 * Retorna o nome do feriado para uma data, ou null se não for feriado.
 */
export function getHolidayName(date: Date | string): string | null {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  const year = d.getFullYear();
  const easter = getEaster(year);

  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

  const addDays = (base: Date, n: number) => {
    const r = new Date(base);
    r.setDate(r.getDate() + n);
    return r;
  };

  const key = fmt(d);

  const named: Record<string, string> = {
    [`${year}-01-01`]: "Ano Novo",
    [`${year}-04-21`]: "Tiradentes",
    [`${year}-05-01`]: "Dia do Trabalho",
    [`${year}-09-07`]: "Independência do Brasil",
    [`${year}-10-12`]: "Nossa Senhora Aparecida",
    [`${year}-11-02`]: "Finados",
    [`${year}-11-15`]: "Proclamação da República",
    [`${year}-11-20`]: "Consciência Negra",
    [`${year}-12-25`]: "Natal",
    [fmt(addDays(easter, -48))]: "Carnaval (2ª feira)",
    [fmt(addDays(easter, -47))]: "Carnaval (3ª feira)",
    [fmt(addDays(easter, -2))]: "Sexta-feira Santa",
    [fmt(easter)]: "Páscoa",
    [fmt(addDays(easter, 60))]: "Corpus Christi",
  };

  return named[key] ?? null;
}
