import { useState, type FormEvent } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { X, Plus, LayoutGrid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AddTableModal() {
  const { addTableModalOpen, setAddTableModalOpen, fetchData, showToast } = usePos();
  const [tableNumber, setTableNumber] = useState<string>('');
  const [capacity, setCapacity] = useState<number>(4);
  const [section, setSection] = useState<string>('Main Dining');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!addTableModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableNumber.trim(),
          capacity,
          section,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to create table' }));
        throw new Error(errorData.error || 'Failed to create table');
      }
      showToast(`Table ${tableNumber} created successfully`);
      await fetchData();
      setAddTableModalOpen(false);
      setTableNumber('');
      setCapacity(4);
    } catch (err: any) {
      showToast('Error creating table: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-table-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Add New Restaurant Table</h3>
          </div>
          <button
            onClick={() => setAddTableModalOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Table Identifier / Number
            </label>
            <input
              type="text"
              id="input-new-table-num"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. T-09, PATIO-04, BAR-05"
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Guest Capacity
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Dining Section
              </label>
              <Select value={section} onValueChange={value => setSection(value ?? 'Main Dining')}>
                <SelectTrigger className="h-9 w-full rounded-xl bg-white text-xs shadow-2xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Dining">Main Dining</SelectItem>
                  <SelectItem value="Patio">Patio</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                  <SelectItem value="VIP">VIP Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAddTableModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-submit-add-table"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Table</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
