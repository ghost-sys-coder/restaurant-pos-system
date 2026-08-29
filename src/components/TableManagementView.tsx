import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import TableCard from './TableCard.tsx';
import AddTableModal from './AddTableModal.tsx';
import EditTableModal from './EditTableModal.tsx';
import { RestaurantTable } from '../types.ts';
import { Plus, LayoutGrid, Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';

export default function TableManagementView() {
  const { tables, setAddTableModalOpen } = usePos();
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  const sections = ['All', 'Main Dining', 'Patio', 'Bar', 'VIP'];

  const filteredTables =
    selectedSection === 'All'
      ? tables
      : tables.filter((t) => t.section === selectedSection);

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const billingCount = tables.filter((t) => t.status === 'billing').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

  return (
    <div
      id="table-management-view"
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 lg:p-6 space-y-5 text-slate-900"
    >
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Floor Plan & Table Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time table turnover, dining sections, and guest occupancy
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{availableCount} Available</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            <span>{occupiedCount} Occupied</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
            <span>{billingCount} Billing</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{totalCapacity} Total Seats</span>
          </div>

          <button
            id="btn-open-add-table"
            onClick={() => setAddTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin scrollbar-thumb-slate-200">
        {sections.map((sec) => {
          const isSelected = selectedSection === sec;
          const count =
            sec === 'All' ? tables.length : tables.filter((t) => t.section === sec).length;
          return (
            <button
              key={sec}
              id={`sec-filter-${sec.toLowerCase().replace(' ', '-')}`}
              onClick={() => setSelectedSection(sec)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{sec}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        {filteredTables.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
            <Sparkles className="w-8 h-8 opacity-30 text-indigo-500 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No tables in this section</p>
            <p className="text-xs text-slate-400">Add a table or switch to another section.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredTables.map((table) => (
              <TableCard key={table.id} table={table} onEdit={() => setEditingTable(table)} />
            ))}
          </div>
        )}
      </div>

      <AddTableModal />
      {editingTable && <EditTableModal table={editingTable} onClose={() => setEditingTable(null)} />}
    </div>
  );
}
