import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import MenuItemEditModal from './MenuItemEditModal.tsx';
import { MenuItem } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { BookOpen, Plus, Edit2, Trash2, Search, Check, AlertCircle } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.tsx';

export default function MenuManagementView() {
  const { menuItems, categories, fetchData, showToast } = usePos();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [archiveTarget, setArchiveTarget] = useState<MenuItem | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const filteredItems = menuItems.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  });

  const handleToggle86 = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isAvailable: !item.isAvailable }),
      });
      if (res.ok) {
        showToast(
          `${item.name} is now ${!item.isAvailable ? 'Available' : "86'd (Sold Out)"}`
        );
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async () => {
    if (!archiveTarget) return; setArchiveBusy(true);
      try {
        const res = await fetch(`/api/menu-items/${archiveTarget.id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Archived ${archiveTarget.name}`);
          await fetchData();
          setArchiveTarget(null);
        }
      } catch (e) {
        console.error(e);
      } finally { setArchiveBusy(false); }
  };

  return (
    <div
      id="menu-management-view"
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 lg:p-6 space-y-5 text-slate-900"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Menu & Catalog Manager
              </h2>
              <p className="text-xs text-slate-500">
                Update prices, recipe descriptions, 86'd ingredients, and dish categories
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-catalog-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <button
            id="btn-create-menu-dish"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Items List Table */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xs scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4">Item</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Price</th>
              <th className="py-3.5 px-4">Cook Time</th>
              <th className="py-3.5 px-4">Calories</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const cat = categories.find((c) => c.id === item.categoryId);

              return (
                <tr
                  key={item.id}
                  id={`catalog-row-${item.id}`}
                  className="hover:bg-slate-50/80 transition"
                >
                  {/* Dish name & thumb */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                            🍴
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[240px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 font-semibold text-slate-700">
                    {cat?.name || 'Uncategorized'}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(item.price)}
                  </td>

                  {/* Cook time */}
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {item.prepTimeMinutes} mins
                  </td>

                  {/* Calories */}
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {item.calories ? `${item.calories} kcal` : '—'}
                  </td>

                  {/* 86 status button */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggle86(item)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer border ${
                        item.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>86'd (Sold Out)</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setArchiveTarget(item)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {(editingItem || isCreating) && (
        <MenuItemEditModal
          item={editingItem}
          onClose={() => {
            setEditingItem(null);
            setIsCreating(false);
          }}
        />
      )}
      <ConfirmDialog open={Boolean(archiveTarget)} title="Archive this menu item?" description={`${archiveTarget?.name || 'This item'} will disappear from the active catalog while remaining attached to historical orders.`} confirmLabel="Archive item" busy={archiveBusy} onCancel={() => setArchiveTarget(null)} onConfirm={handleDeleteItem} />
    </div>
  );
}
