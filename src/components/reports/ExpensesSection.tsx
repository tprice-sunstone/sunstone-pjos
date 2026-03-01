// ============================================================================
// ExpensesSection — src/components/reports/ExpensesSection.tsx
// ============================================================================
// Self-contained expenses section for the Reports page.
// Fetches, displays, and manages expenses with CRUD operations.
// Reports aggregated category totals to parent via onTotalsReady callback.
// ============================================================================

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button,
  Badge,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import { EXPENSE_CATEGORIES } from '@/types';
import type { Expense, Event } from '@/types';

export interface ExpenseTotals {
  total: number;
  byCategory: Record<string, number>;
}

interface ExpensesSectionProps {
  tenantId: string;
  startDate: string;
  endDate: string;
  eventId?: string | null;
  onTotalsReady: (totals: ExpenseTotals) => void;
}

const categoryColors: Record<string, string> = {
  'Booth Fee': 'bg-purple-100 text-purple-700',
  'Supplies': 'bg-blue-100 text-blue-700',
  'Chain Restock': 'bg-amber-100 text-amber-700',
  'Travel & Gas': 'bg-green-100 text-green-700',
  'Marketing & Advertising': 'bg-pink-100 text-pink-700',
  'Equipment': 'bg-gray-100 text-gray-700',
  'Insurance': 'bg-red-100 text-red-700',
  'Software & Subscriptions': 'bg-indigo-100 text-indigo-700',
  'Education & Training': 'bg-teal-100 text-teal-700',
  'Packaging & Display': 'bg-orange-100 text-orange-700',
  'Other': 'bg-gray-100 text-gray-600',
};

const money = (n: number) => {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${formatted}` : `$${formatted}`;
};

export default function ExpensesSection({ tenantId, startDate, endDate, eventId, onTotalsReady }: ExpensesSectionProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formEventId, setFormEventId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formFrequency, setFormFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (eventId) params.set('event_id', eventId);
    const res = await fetch(`/api/expenses?${params}`);
    if (res.ok) {
      const data = await res.json();
      setExpenses(data);
    }
    setLoading(false);
  }, [startDate, endDate, eventId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // Load events for the dropdown
  useEffect(() => {
    fetch(`/api/expenses?startDate=2000-01-01&endDate=2099-12-31`)
      .catch(() => {});
    // We fetch events list separately via supabase client-side; use a simple API approach
    // Events are loaded in the parent — for now use a simpler fetch
  }, [tenantId]);

  // Compute and report totals
  const totals = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const exp of expenses) {
      const amt = Number(exp.amount);
      total += amt;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + amt;
    }
    return { total, byCategory };
  }, [expenses]);

  useEffect(() => {
    onTotalsReady(totals);
  }, [totals, onTotalsReady]);

  const handleSave = async () => {
    if (!formName.trim() || !formAmount || !formCategory || !formDate) {
      toast.error('Name, amount, category, and date are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          amount: Number(formAmount),
          category: formCategory,
          date: formDate,
          event_id: formEventId || null,
          notes: formNotes.trim() || null,
          is_recurring: formRecurring,
          recurring_frequency: formRecurring ? formFrequency : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save expense');
        return;
      }
      toast.success('Expense added');
      setShowModal(false);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to delete expense');
        return;
      }
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormEventId('');
    setFormNotes('');
    setFormRecurring(false);
    setFormFrequency('monthly');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle>Expenses</CardTitle>
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            + Add Expense
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="text-[var(--text-tertiary)] text-sm mt-2">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-[var(--text-tertiary)] text-center py-8 text-sm">
            No expenses recorded for this period.
          </p>
        ) : (
          <>
            {/* Expense list */}
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border-subtle)] last:border-b-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs text-[var(--text-tertiary)] w-16 shrink-0">
                    {format(new Date(exp.date + 'T00:00:00'), 'MMM d')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-primary)] truncate">{exp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[exp.category] || categoryColors['Other']}`}>
                        {exp.category}
                      </span>
                      {exp.event && (
                        <span className="text-[10px] text-[var(--text-tertiary)]">{exp.event.name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{money(Number(exp.amount))}</span>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="p-1 rounded hover:bg-[var(--surface-subtle)] text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                    title="Delete expense"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Category totals */}
            {Object.keys(totals.byCategory).length > 0 && (
              <div className="border-t border-[var(--border-default)] mt-2 pt-3 space-y-1.5">
                {Object.entries(totals.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)]">{cat}</span>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{money(amt)}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Total Expenses</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{money(totals.total)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Add Expense Modal */}
      {showModal && (
        <Modal isOpen onClose={() => { setShowModal(false); resetForm(); }}>
          <ModalHeader>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Expense</h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Spring Market Booth"
              />
              <Input
                label="Amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
              />
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)]"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)] resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRecurring}
                  onChange={(e) => setFormRecurring(e.target.checked)}
                  className="accent-[var(--accent-primary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Recurring expense</span>
              </label>
              {formRecurring && (
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)]"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Add Expense
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </Card>
  );
}
