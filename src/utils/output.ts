/**
 * Output formatters for human-readable and JSON output.
 * No external dependencies — uses only Node.js builtins.
 */

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  transform?: (value: unknown) => string;
}

export interface FieldDef {
  key: string;
  label: string;
  transform?: (value: unknown) => string;
}

const NO_COLOR = 'NO_COLOR' in process.env;

function color(code: number, text: string): string {
  if (NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const colors = {
  dim: (t: string) => color(2, t),
  green: (t: string) => color(32, t),
  yellow: (t: string) => color(33, t),
  red: (t: string) => color(31, t),
  cyan: (t: string) => color(36, t),
  bold: (t: string) => color(1, t),
} as const;

/** Print raw JSON envelope to stdout (for --json flag). */
export function printJson(envelope: unknown): void {
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');
}

/** Print an array of objects as a formatted table. */
export function printTable(rows: Record<string, unknown>[], columns: ColumnDef[]): void {
  if (rows.length === 0) {
    process.stdout.write(colors.dim('(no results)') + '\n');
    return;
  }

  const termWidth = process.stdout.columns || 80;

  // Calculate column widths.
  const widths = columns.map((col) => {
    if (col.width) return col.width;
    const headerLen = col.label.length;
    const maxDataLen = rows.reduce((max, row) => {
      const val = formatCell(row[col.key], col.transform);
      return Math.max(max, stripAnsi(val).length);
    }, 0);
    return Math.max(headerLen, maxDataLen);
  });

  // Clamp total width to terminal.
  const totalWidth = widths.reduce((s, w) => s + w + 2, 0);
  if (totalWidth > termWidth && widths.length > 0) {
    // Shrink the last column.
    const shrink = totalWidth - termWidth;
    widths[widths.length - 1] = Math.max(4, widths[widths.length - 1] - shrink);
  }

  // Header.
  const header = columns.map((col, i) => pad(col.label, widths[i])).join('  ');
  process.stdout.write(colors.bold(header) + '\n');
  process.stdout.write(columns.map((_, i) => '─'.repeat(widths[i])).join('  ') + '\n');

  // Rows.
  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const val = formatCell(row[col.key], col.transform);
        return pad(val, widths[i]);
      })
      .join('  ');
    process.stdout.write(line + '\n');
  }
}

/** Print a single object as key-value pairs. */
export function printKeyValue(record: Record<string, unknown>, fields: FieldDef[]): void {
  const maxLabel = fields.reduce((m, f) => Math.max(m, f.label.length), 0);

  for (const field of fields) {
    const val = record[field.key];
    if (val === undefined || val === null) continue;
    const formatted = field.transform ? field.transform(val) : String(val);
    const label = field.label.padEnd(maxLabel);
    process.stdout.write(`${colors.dim(label)}  ${formatted}\n`);
  }
}

/** Print a success message (green checkmark). */
export function printSuccess(message: string): void {
  process.stderr.write(colors.green('✓') + ' ' + message + '\n');
}

/** Print an error message to stderr. */
export function printError(message: string): void {
  process.stderr.write(colors.red('error:') + ' ' + message + '\n');
}

/** Print pagination info to stderr. */
export function printPagination(meta?: { next_cursor?: string | null; has_more?: boolean }): void {
  if (meta?.has_more && meta.next_cursor) {
    process.stderr.write(colors.dim(`(more results available, use --cursor ${meta.next_cursor})`) + '\n');
  }
}

// Helpers

function formatCell(value: unknown, transform?: (v: unknown) => string): string {
  if (transform) return transform(value);
  if (value === null || value === undefined) return colors.dim('—');
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function pad(text: string, width: number): string {
  const visible = stripAnsi(text).length;
  if (visible >= width) return text.slice(0, width + (text.length - visible));
  return text + ' '.repeat(width - visible);
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}
