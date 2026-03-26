// ============================================================================
// CSV Templates — src/lib/csv-templates.ts
// ============================================================================

export function getClientTemplate(): string {
  return [
    'first_name,last_name,email,phone,notes,tags',
    'Jane,Smith,jane@email.com,5551234567,VIP customer - loves gold,VIP',
    'Mike,Johnson,mike@example.com,5559876543,Prefers silver chains,"New Client,Repeat Client"',
    'Sarah,Williams,,5551112222,Walk-in from Downtown Market,',
  ].join('\n');
}

export function getInventoryTemplate(): string {
  return [
    'name,type,material,sku,unit,quantity,cost_per_unit,sell_price,reorder_threshold,notes',
    'Chloe,chain,14/20 Gold Filled Yellow,CHN-CHLOE,inches,500,0.95,0,50,Best seller - always keep stocked',
    '14K Rose Gold Jump Rings,jump_ring,,JR-14KRG,each,200,0.45,0,50,24 gauge',
    'Heart Connector,connector,Gold Filled,,each,25,3.50,12.00,10,',
  ].join('\n');
}

export const CLIENT_COLUMNS = ['first_name', 'last_name', 'email', 'phone', 'notes', 'tags'] as const;
export const INVENTORY_COLUMNS = ['name', 'type', 'material', 'sku', 'unit', 'quantity', 'cost_per_unit', 'sell_price', 'reorder_threshold', 'notes'] as const;

// Download a CSV string as a file
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Escape a field for CSV output (wrap in quotes if it contains comma, quote, or newline)
export function escapeCSVField(value: string | null | undefined): string {
  const s = value ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
