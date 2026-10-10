/**
 * csv.ts — build and download a CSV file in the browser (no server round-trip).
 *
 * toCsv is pure (tested): quotes every cell and doubles inner quotes, so commas,
 * quotes and new-lines inside text never break columns. A UTF-8 BOM is added so
 * Excel shows Hindi/Tamil/etc. correctly instead of garbage characters.
 * Also blocks "CSV injection": a cell starting with = + - @ is prefixed with '
 * so Excel does not run it as a formula.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    let s = v === null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
