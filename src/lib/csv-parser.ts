// ============================================================================
// CSV Parser — src/lib/csv-parser.ts
// ============================================================================
// Manual CSV parser — handles quoted fields, various line endings, trimming.
// No external dependencies.

export interface ParsedRow {
  [key: string]: string;
}

/**
 * Parse a CSV string into an array of objects keyed by header names.
 * Handles: quoted fields with commas, escaped quotes (""), \r\n / \r / \n endings.
 * Extra columns are ignored. Missing columns default to empty string.
 */
export function parseCSV(csv: string): ParsedRow[] {
  const lines = splitCSVLines(csv);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVRow(line);
    const row: ParsedRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Split CSV text into lines, respecting quoted fields that span multiple lines.
 */
function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      lines.push(current);
      current = '';
      // Handle \r\n
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * Parse a single CSV row into an array of field values.
 */
function parseCSVRow(row: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];

    if (inQuotes) {
      if (ch === '"') {
        if (row[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current);
  return fields;
}

// ── Phone normalization ────────────────────────────────────────────────────

/**
 * Normalize a phone string to 10 digits. Returns null if invalid.
 * Strips parentheses, dashes, spaces, dots, and leading +1/1 country code.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1);
  return null;
}

// ── Inventory type normalization ───────────────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  chain: 'chain',
  charm: 'charm',
  connector: 'connector',
  clasp: 'clasp',
  other: 'other',
  jump_ring: 'jump_ring',
  'jump ring': 'jump_ring',
  jumpring: 'jump_ring',
  'jump rings': 'jump_ring',
  'jump_rings': 'jump_ring',
};

const VALID_TYPES = new Set(['chain', 'jump_ring', 'charm', 'connector', 'clasp', 'other']);

export function normalizeInventoryType(raw: string): string {
  const key = raw.trim().toLowerCase();
  const mapped = TYPE_MAP[key];
  if (mapped) return mapped;
  if (VALID_TYPES.has(key)) return key;
  return 'other';
}

// ── Inventory unit normalization ───────────────────────────────────────────

const UNIT_MAP: Record<string, string> = {
  inches: 'in',
  inch: 'in',
  in: 'in',
  feet: 'ft',
  foot: 'ft',
  ft: 'ft',
  each: 'each',
  ea: 'each',
  pack: 'pack',
  pk: 'pack',
};

export function normalizeInventoryUnit(raw: string, type: string): string {
  if (raw) {
    const mapped = UNIT_MAP[raw.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  // Auto-detect from type
  return type === 'chain' ? 'in' : 'each';
}
