import { useState, type FormEvent } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { MenuItem } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { X, Check, BookOpen } from 'lucide-react';

export default function MenuItemEditModal({
  item,
  onClose,
}: {
  item: MenuItem | null;
  onClose: () => void;
}) {
  const { categories, fetchData, showToast } = usePos();
  const [name, setName] = useState<string>(item?.name || '');
  const [categoryId, setCategoryId] = useState<number>(
    item?.categoryId || categories[0]?.id || 1
  );
  const [priceDollars, setPriceDollars] = useState<string>(
    item ? (item.price / 100).toFixed(2) : '15.00'
  );
  const [description, setDescription] = useState<string>(item?.description || '');
  const [imageUrl, setImageUrl] = useState<string>(item?.imageUrl || '');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(
    item?.prepTimeMinutes || 10
  );
  const [calories, setCalories] = useState<number>(item?.calories || 450);
  const [allergens, setAllergens] = useState<string>(item?.allergens || '');
  const [isAvailable, setIsAvailable] = useState<boolean>(
    item ? item.isAvailable : true
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const priceCents = Math.round(parseFloat(priceDollars) * 100) || 1000;

    const payload = {
      name: name.trim(),
      categoryId,
      price: priceCents,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      prepTimeMinutes,
      calories,
      allergens: allergens.trim(),
      isAvailable,
    };

    try {
      const url = item ? `/api/menu-items/${item.id}` : '/api/menu-items';
      const method = item ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save menu item');
      showToast(`${name} ${item ? 'updated' : 'added to catalog'}`);
      await fetchData();
      onClose();
    } catch (err: any) {
      showToast('Error saving item: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="menu-item-edit-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {item ? `Edit Dish: ${item.name}` : 'Create New Menu Dish'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-200"
        >
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Dish / Item Name
            </label>
            <input
              type="text"
              id="input-dish-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lobster Ravioli"
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Category
              </label>
              <select
                id="select-dish-category"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.50"
                id="input-dish-price"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-mono font-bold shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Description / Ingredients
            </label>
            <textarea
              rows={2}
              id="input-dish-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of taste, ingredients, and preparation..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none shadow-2xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Image URL (Unsplash or hosted)
            </label>
            <input
              type="text"
              id="input-dish-img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Cook Time (min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Calories (kcal)
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Allergens Tag
              </label>
              <input
                type="text"
                value={allergens}
                onChange={(e) => setAllergens(e.target.value)}
                placeholder="Gluten, Dairy"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Item Availability (86'd Status)</p>
              <p className="text-[11px] text-slate-500">
                Turn off if ingredients are out of stock
              </p>
            </div>
            <button
              type="button"
              id="btn-toggle-availability"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs ${
                  isAvailable ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-save-menu-item"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{item ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
