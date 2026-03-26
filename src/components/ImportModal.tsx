// ============================================================================
// Import Modal — src/components/ImportModal.tsx
// ============================================================================
// Shared import modal for Clients and Inventory. 3-step flow:
// 1. Download template + upload file
// 2. Preview + validate
// 3. Processing + results

'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '@/components/ui';
import { parseCSV, normalizePhone, normalizeInventoryType, normalizeInventoryUnit, type ParsedRow } from '@/lib/csv-parser';
import { getClientTemplate, getInventoryTemplate, downloadCSV, escapeCSVField } from '@/lib/csv-templates';

type ImportMode = 'clients' | 'inventory';
type Step = 'upload' | 'preview' | 'processing';

interface ValidatedRow {
  data: ParsedRow;
  errors: string[];
  isUpdate: boolean;
  existingId?: string;
}

interface ImportResults {
  created: number;
  updated: number;
  skipped: number;
  errorRows: { row: ParsedRow; errors: string[] }[];
}

interface ImportModalProps {
  mode: ImportMode;
  tenantId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function ImportModal({ mode, tenantId, onClose, onComplete }: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState<ImportResults | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const label = mode === 'clients' ? 'Clients' : 'Inventory';
  const itemLabel = mode === 'clients' ? 'clients' : 'items';

  // ── Step 1: Template download ──────────────────────────────────────────

  const handleDownloadTemplate = () => {
    const content = mode === 'clients' ? getClientTemplate() : getInventoryTemplate();
    const name = mode === 'clients' ? 'clients-template.csv' : 'inventory-template.csv';
    downloadCSV(content, name);
  };

  // ── Step 1: File upload ────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      const isSpreadsheet = ['xlsx', 'xls', 'xlsm', 'numbers', 'ods'].includes(ext || '');
      toast.error(
        isSpreadsheet
          ? 'Please save your spreadsheet as a CSV file first. In Excel: File → Save As → CSV (Comma delimited).'
          : 'Please upload a .csv file.'
      );
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length === 0) {
      toast.error('The file is empty or contains only headers.');
      return;
    }

    // Validate rows
    const validated = await validateRows(parsed);
    setRows(validated);
    setStep('preview');
  }, [mode, tenantId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ── Validation ─────────────────────────────────────────────────────────

  const validateRows = async (parsed: ParsedRow[]): Promise<ValidatedRow[]> => {
    if (mode === 'clients') return validateClientRows(parsed);
    return validateInventoryRows(parsed);
  };

  const validateClientRows = async (parsed: ParsedRow[]): Promise<ValidatedRow[]> => {
    // Fetch existing clients for duplicate detection
    const { data: existing } = await supabase
      .from('clients')
      .select('id, email, phone')
      .eq('tenant_id', tenantId);

    const existingByEmail = new Map<string, string>();
    const existingByPhone = new Map<string, string>();
    for (const c of existing || []) {
      if (c.email) existingByEmail.set(c.email.toLowerCase(), c.id);
      if (c.phone) existingByPhone.set(c.phone, c.id);
    }

    return parsed.map((row) => {
      const errors: string[] = [];
      let isUpdate = false;
      let existingId: string | undefined;

      if (!row.first_name?.trim()) {
        errors.push('Missing first_name (required)');
      }

      // Normalize phone
      if (row.phone?.trim()) {
        const normalized = normalizePhone(row.phone);
        if (!normalized) {
          errors.push(`Invalid phone: "${row.phone}" — must be 10 digits`);
        }
      }

      // Duplicate detection
      const email = row.email?.trim().toLowerCase();
      const phone = row.phone?.trim() ? normalizePhone(row.phone) : null;

      if (email && existingByEmail.has(email)) {
        isUpdate = true;
        existingId = existingByEmail.get(email);
      } else if (phone && existingByPhone.has(phone)) {
        isUpdate = true;
        existingId = existingByPhone.get(phone);
      }

      return { data: row, errors, isUpdate, existingId };
    });
  };

  const validateInventoryRows = async (parsed: ParsedRow[]): Promise<ValidatedRow[]> => {
    // Fetch existing items for duplicate detection
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('id, name, type')
      .eq('tenant_id', tenantId);

    const existingMap = new Map<string, string>();
    for (const item of existing || []) {
      existingMap.set(`${item.name.toLowerCase()}|${item.type}`, item.id);
    }

    return parsed.map((row) => {
      const errors: string[] = [];
      let isUpdate = false;
      let existingId: string | undefined;

      if (!row.name?.trim()) {
        errors.push('Missing name (required)');
      }

      const type = normalizeInventoryType(row.type || '');

      // Check for invalid type that was defaulted
      if (row.type?.trim() && type === 'other' && row.type.trim().toLowerCase() !== 'other') {
        errors.push(`Unknown type "${row.type}" — defaulting to "other"`);
      }

      // Numeric validation
      for (const field of ['quantity', 'cost_per_unit', 'sell_price', 'reorder_threshold']) {
        if (row[field]?.trim() && isNaN(Number(row[field]))) {
          errors.push(`Invalid number for ${field}: "${row[field]}"`);
        }
      }

      // Duplicate detection
      if (row.name?.trim()) {
        const key = `${row.name.trim().toLowerCase()}|${type}`;
        if (existingMap.has(key)) {
          isUpdate = true;
          existingId = existingMap.get(key);
        }
      }

      return { data: row, errors, isUpdate, existingId };
    });
  };

  // ── Step 3: Import execution ───────────────────────────────────────────

  const runImport = async () => {
    setStep('processing');
    setProgress(0);

    const validRows = rows.filter((r) => r.errors.length === 0 || (r.errors.length > 0 && r.errors.every(e => e.includes('defaulting to'))));
    const errorRows = rows.filter((r) => r.errors.some(e => !e.includes('defaulting to')));

    const res: ImportResults = {
      created: 0,
      updated: 0,
      skipped: errorRows.length,
      errorRows: errorRows.map((r) => ({ row: r.data, errors: r.errors })),
    };

    const BATCH = 25;
    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH);

      if (mode === 'clients') {
        await importClientBatch(batch, res);
      } else {
        await importInventoryBatch(batch, res);
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / validRows.length) * 100)));
    }

    setResults(res);
    setProgress(100);
  };

  // ── Client import batch ────────────────────────────────────────────────

  const importClientBatch = async (batch: ValidatedRow[], res: ImportResults) => {
    for (const row of batch) {
      try {
        const phone = row.data.phone?.trim() ? normalizePhone(row.data.phone) : null;
        const email = row.data.email?.trim() || null;

        if (row.isUpdate && row.existingId) {
          // Merge update — only fill empty fields
          const { data: current } = await supabase
            .from('clients')
            .select('first_name, last_name, email, phone, notes')
            .eq('id', row.existingId)
            .single();

          const updates: Record<string, string | null> = {};
          if (!current?.first_name && row.data.first_name?.trim()) updates.first_name = row.data.first_name.trim();
          if (!current?.last_name && row.data.last_name?.trim()) updates.last_name = row.data.last_name.trim();
          if (!current?.email && email) updates.email = email;
          if (!current?.phone && phone) updates.phone = phone;
          if (!current?.notes && row.data.notes?.trim()) updates.notes = row.data.notes.trim();

          // Always update first_name if provided (it's the primary identifier)
          if (row.data.first_name?.trim() && current?.first_name !== row.data.first_name.trim()) {
            updates.first_name = row.data.first_name.trim();
          }
          if (row.data.last_name?.trim() && !current?.last_name) {
            updates.last_name = row.data.last_name.trim();
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from('clients').update(updates).eq('id', row.existingId);
          }
          res.updated++;
        } else {
          // Insert new client
          const { data: newClient } = await supabase.from('clients').insert({
            tenant_id: tenantId,
            first_name: row.data.first_name?.trim() || null,
            last_name: row.data.last_name?.trim() || null,
            email,
            phone,
            notes: row.data.notes?.trim() || null,
          }).select('id').single();

          if (newClient) {
            res.created++;

            // Handle tags
            if (row.data.tags?.trim()) {
              await assignTags(newClient.id, row.data.tags);
            }
          }
        }

        // Handle tags for updates too
        if (row.isUpdate && row.existingId && row.data.tags?.trim()) {
          await assignTags(row.existingId, row.data.tags);
        }
      } catch {
        res.skipped++;
        res.errorRows.push({ row: row.data, errors: ['Database error during import'] });
      }
    }
  };

  // ── Tag assignment helper ──────────────────────────────────────────────

  const assignTags = async (clientId: string, tagsStr: string) => {
    const tagNames = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    for (const name of tagNames) {
      // Find or create tag
      let { data: tag } = await supabase
        .from('client_tags')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('name', name)
        .single();

      if (!tag) {
        const { data: newTag } = await supabase.from('client_tags').insert({
          tenant_id: tenantId,
          name,
        }).select('id').single();
        tag = newTag;
      }

      if (tag) {
        // Upsert assignment (ignore conflict)
        await supabase.from('client_tag_assignments').upsert(
          { client_id: clientId, tag_id: tag.id },
          { onConflict: 'client_id,tag_id' }
        );
      }
    }
  };

  // ── Inventory import batch ─────────────────────────────────────────────

  const importInventoryBatch = async (batch: ValidatedRow[], res: ImportResults) => {
    for (const row of batch) {
      try {
        const type = normalizeInventoryType(row.data.type || '');
        const unit = normalizeInventoryUnit(row.data.unit || '', type);

        if (row.isUpdate && row.existingId) {
          // Merge update — only fill empty fields
          const { data: current } = await supabase
            .from('inventory_items')
            .select('material, sku, notes, cost_per_unit, sell_price, quantity_on_hand, reorder_threshold')
            .eq('id', row.existingId)
            .single();

          const updates: Record<string, string | number | null> = {};
          if (!current?.material && row.data.material?.trim()) updates.material = row.data.material.trim();
          if (!current?.sku && row.data.sku?.trim()) updates.sku = row.data.sku.trim();
          if (!current?.notes && row.data.notes?.trim()) updates.notes = row.data.notes.trim();

          // Numeric fields: update if import has a non-zero value and current is 0
          if (row.data.quantity?.trim() && Number(row.data.quantity) > 0 && Number(current?.quantity_on_hand) === 0) {
            updates.quantity_on_hand = Number(row.data.quantity);
          }
          if (row.data.cost_per_unit?.trim() && Number(row.data.cost_per_unit) > 0 && Number(current?.cost_per_unit) === 0) {
            updates.cost_per_unit = Number(row.data.cost_per_unit);
          }
          if (row.data.sell_price?.trim() && Number(row.data.sell_price) > 0 && Number(current?.sell_price) === 0) {
            updates.sell_price = Number(row.data.sell_price);
          }
          if (row.data.reorder_threshold?.trim() && Number(row.data.reorder_threshold) > 0 && Number(current?.reorder_threshold) === 0) {
            updates.reorder_threshold = Number(row.data.reorder_threshold);
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from('inventory_items').update(updates).eq('id', row.existingId);
          }
          res.updated++;
        } else {
          // Insert new item
          await supabase.from('inventory_items').insert({
            tenant_id: tenantId,
            name: row.data.name.trim(),
            type,
            material: row.data.material?.trim() || null,
            sku: row.data.sku?.trim() || null,
            unit,
            quantity_on_hand: Number(row.data.quantity) || 0,
            cost_per_unit: Number(row.data.cost_per_unit) || 0,
            sell_price: Number(row.data.sell_price) || 0,
            reorder_threshold: Number(row.data.reorder_threshold) || 0,
            notes: row.data.notes?.trim() || null,
            is_active: true,
          });
          res.created++;
        }
      } catch {
        res.skipped++;
        res.errorRows.push({ row: row.data, errors: ['Database error during import'] });
      }
    }
  };

  // ── Error report download ──────────────────────────────────────────────

  const downloadErrorReport = () => {
    if (!results?.errorRows.length) return;
    const headers = mode === 'clients'
      ? 'first_name,last_name,email,phone,notes,tags,error'
      : 'name,type,material,sku,unit,quantity,cost_per_unit,sell_price,reorder_threshold,notes,error';

    const lines = [headers];
    for (const { row, errors } of results.errorRows) {
      const vals = mode === 'clients'
        ? [row.first_name, row.last_name, row.email, row.phone, row.notes, row.tags]
        : [row.name, row.type, row.material, row.sku, row.unit, row.quantity, row.cost_per_unit, row.sell_price, row.reorder_threshold, row.notes];
      lines.push([...vals.map(escapeCSVField), escapeCSVField(errors.join('; '))].join(','));
    }

    downloadCSV(lines.join('\n'), `import-errors-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // ── Computed stats ─────────────────────────────────────────────────────

  const validCount = rows.filter((r) => r.errors.length === 0 || r.errors.every(e => e.includes('defaulting to'))).length;
  const updateCount = rows.filter((r) => r.isUpdate && (r.errors.length === 0 || r.errors.every(e => e.includes('defaulting to')))).length;
  const newCount = validCount - updateCount;
  const errorCount = rows.filter((r) => r.errors.some(e => !e.includes('defaulting to'))).length;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Modal isOpen onClose={onClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Import {label}
        </h2>
      </ModalHeader>

      <ModalBody>
        {/* ── Step 1: Upload ────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-5">
            <p className="text-sm text-[var(--text-secondary)]">
              Download our template, fill it in with your data, then upload it here. The first row must be the column headers.
            </p>

            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Template
              </span>
            </Button>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              <svg className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Drop a CSV file here or tap to browse
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">.csv files only</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>
        )}

        {/* ── Step 2: Preview ───────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {fileName} — {rows.length} row{rows.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
                className="text-xs text-[var(--accent-primary)] hover:underline"
              >
                Choose different file
              </button>
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              {newCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                  {newCount} new {itemLabel}
                </span>
              )}
              {updateCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {updateCount} updates
                </span>
              )}
              {errorCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  {errorCount} will be skipped
                </span>
              )}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto border border-[var(--border-default)] rounded-lg max-h-[340px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-raised)] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">#</th>
                    {mode === 'clients' ? (
                      <>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Name</th>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Email</th>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Phone</th>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Tags</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Name</th>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Type</th>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Qty</th>
                        <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Cost</th>
                      </>
                    )}
                    <th className="text-left px-3 py-2 text-[var(--text-tertiary)] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, i) => {
                    const hasRealError = row.errors.some(e => !e.includes('defaulting to'));
                    return (
                      <tr
                        key={i}
                        className={hasRealError ? 'bg-amber-50/50' : row.isUpdate ? 'bg-blue-50/30' : ''}
                      >
                        <td className="px-3 py-2 text-[var(--text-tertiary)]">{i + 1}</td>
                        {mode === 'clients' ? (
                          <>
                            <td className="px-3 py-2 text-[var(--text-primary)]">
                              {row.data.first_name} {row.data.last_name}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.data.email}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.data.phone}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.data.tags}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-[var(--text-primary)]">{row.data.name}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.data.type || 'other'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.data.quantity || '0'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary)]">
                              {row.data.cost_per_unit ? `$${Number(row.data.cost_per_unit).toFixed(2)}` : '—'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          {hasRealError ? (
                            <span className="text-amber-600" title={row.errors.join(', ')}>
                              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                              </svg>
                              {row.errors.filter(e => !e.includes('defaulting to'))[0]}
                            </span>
                          ) : row.isUpdate ? (
                            <span className="text-blue-600 text-[11px]">Update</span>
                          ) : (
                            <span className="text-green-600 text-[11px]">New</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="text-xs text-[var(--text-tertiary)] px-3 py-2 border-t border-[var(--border-default)]">
                  Showing first 50 of {rows.length} rows
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Processing / Results ──────────────────────────── */}
        {step === 'processing' && !results && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-[var(--accent-muted)] border-t-[var(--accent-primary)] animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">
              Importing {itemLabel}... {progress}%
            </p>
            <div className="w-full bg-[var(--surface-raised)] rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[var(--accent-primary)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {step === 'processing' && results && (
          <div className="py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <div className="text-center space-y-1">
              {results.created > 0 && (
                <p className="text-sm text-green-700 font-medium">
                  {results.created} {itemLabel} created
                </p>
              )}
              {results.updated > 0 && (
                <p className="text-sm text-blue-700 font-medium">
                  {results.updated} {itemLabel} updated
                </p>
              )}
              {results.skipped > 0 && (
                <p className="text-sm text-amber-700 font-medium">
                  {results.skipped} row{results.skipped !== 1 ? 's' : ''} skipped
                </p>
              )}
              {results.created === 0 && results.updated === 0 && (
                <p className="text-sm text-[var(--text-secondary)]">No changes were made.</p>
              )}
            </div>

            {results.errorRows.length > 0 && (
              <div className="text-center">
                <button
                  onClick={downloadErrorReport}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Download error report
                </button>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'upload' && (
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        )}
        {step === 'preview' && (
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}>
              Back
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={validCount === 0}
              onClick={runImport}
            >
              Import {validCount} {itemLabel}
            </Button>
          </div>
        )}
        {step === 'processing' && results && (
          <Button variant="primary" className="w-full" onClick={() => { onComplete(); onClose(); }}>
            Done
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
