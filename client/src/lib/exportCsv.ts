/**
 * Utilitário de exportação de dados para CSV e Excel (XLSX via CSV com BOM UTF-8).
 * Não requer dependências externas — usa apenas APIs nativas do browser.
 */

type Row = Record<string, string | number | null | undefined>;

/**
 * Converte um array de objetos para CSV com BOM UTF-8 (compatível com Excel).
 */
function toCsv(headers: { key: string; label: string }[], rows: Row[]): string {
  const BOM = "\uFEFF"; // UTF-8 BOM para compatibilidade com Excel
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const str = String(v);
    // Envolver em aspas se contiver vírgula, aspas ou quebra de linha
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map((h) => escape(h.label)).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escape(row[h.key])).join(",")
  );

  return BOM + [headerRow, ...dataRows].join("\n");
}

/**
 * Dispara o download de um arquivo CSV no browser.
 */
export function downloadCsv(
  filename: string,
  headers: { key: string; label: string }[],
  rows: Row[]
): void {
  const csv = toCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Helpers de formatação para relatórios ────────────────────────────────────

export const SHIFT_LABELS: Record<string, string> = {
  morning: "Matutino",
  afternoon: "Vespertino",
  full_day: "Dia Todo",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
};

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  // Aceita YYYY-MM-DD ou ISO string
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(dateStr);
  return `${match[3]}/${match[2]}/${match[1]}`;
}
