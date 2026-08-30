import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { MenuItem, type MenuOptionGroup } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { X, Check, BookOpen, Copy, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ModifierGroupBuilder from './ModifierGroupBuilder.tsx';

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
  const [priceUGX, setPriceUGX] = useState<string>(
    item ? item.price.toString() : '25000'
  );
  const [description, setDescription] = useState<string>(item?.description || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(item?.imageUrl || '');
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(
    item?.prepTimeMinutes || 10
  );
  const [kitchenStation, setKitchenStation] = useState(item?.kitchenStation || 'main');
  const [calories, setCalories] = useState<number>(item?.calories || 450);
  const [allergens, setAllergens] = useState<string>(item?.allergens || '');
  const [isAvailable, setIsAvailable] = useState<boolean>(
    item ? item.isAvailable : true
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState('');
  const [modifierGroups, setModifierGroups] = useState<MenuOptionGroup[]>(() => {
    try { const parsed = JSON.parse(item?.optionsJson || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  });

  useEffect(() => () => { if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    if (categories.length && !categories.some(category => category.id === categoryId)) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) { showToast('Choose a JPG, PNG, WebP, or AVIF image'); return; }
    if (file.size > 8 * 1024 * 1024) { showToast('Image must be 8 MB or smaller'); return; }
    setImageFile(file); setRemoveImage(false); setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) { showToast('Add and select a category before saving this item'); return; }

    setIsSubmitting(true); setFormError('');
    const parsedPrice = Math.round(parseFloat(priceUGX)) || 25000;

    const invalidGroup = modifierGroups.find(group => !group.name.trim() || !group.choices.length || group.choices.some(choice => !choice.name.trim()));
    if (invalidGroup) { setIsSubmitting(false); setFormError('Every customization needs a question and every choice needs a name.'); return; }
    const optionsJson = JSON.stringify(modifierGroups.map(group => ({ ...group, name: group.name.trim(), choices: group.choices.map(choice => ({ name: choice.name.trim(), price: Math.max(0, Math.round(choice.price || 0)) })) })));
    const payload = new FormData();
    Object.entries({ name: name.trim(), categoryId, price: parsedPrice, description: description.trim(), prepTimeMinutes, kitchenStation, calories, allergens: allergens.trim(), isAvailable, removeImage, optionsJson }).forEach(([key, value]) => payload.set(key, String(value)));
    if (imageFile) payload.set('image', imageFile);

    try {
      const url = item ? `/api/menu-items/${item.id}` : '/api/menu-items';
      const method = item ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        body: payload,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save menu item' }));
        throw new Error(errorData.error || 'Failed to save menu item');
      }
      showToast(`${name} ${item ? 'updated' : 'added to catalog'}`);
      await fetchData();
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="menu-item-edit-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[92vh]">
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
              <Select value={categoryId ? String(categoryId) : null} disabled={!categories.length} onValueChange={value => setCategoryId(value ? Number(value) : 0)}>
                <SelectTrigger id="select-dish-category" className="h-9 w-full rounded-xl bg-white text-xs shadow-2xs"><SelectValue placeholder={categories.length ? 'Select category' : 'Create a category first'} /></SelectTrigger>
                <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Price (UGX)
              </label>
              <input
                type="number"
                step="500"
                min="500"
                id="input-dish-price"
                value={priceUGX}
                onChange={(e) => setPriceUGX(e.target.value)}
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

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Menu image
            </label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={event => chooseImage(event.target.files?.[0])} />
            <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                {previewUrl ? <img src={previewUrl} alt="Selected menu item preview" className="size-full object-cover" /> : <ImagePlus className="size-7 text-slate-300" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                <p className="text-xs text-slate-500">Preview the selected image here. It is uploaded only when you save the item.</p>
                <div className="flex flex-wrap gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-xs ring-1 ring-slate-200 hover:bg-indigo-50">{previewUrl ? 'Change image' : 'Choose image'}</button>
                {previewUrl && <button type="button" onClick={() => { setImageFile(null); setPreviewUrl(''); setRemoveImage(Boolean(item?.imageUrl)); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="size-3.5" />Remove</button>}</div>
                {imageFile && <p className="truncate text-[11px] font-medium text-slate-600">{imageFile.name} · {(imageFile.size / 1024 / 1024).toFixed(1)} MB</p>}
              </div>
            </div>
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
          <div><label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Kitchen station</label><Select value={kitchenStation} onValueChange={value => setKitchenStation(value ?? 'main')}><SelectTrigger className="h-9 w-full rounded-xl bg-white text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="main">Main kitchen</SelectItem><SelectItem value="grill">Grill</SelectItem><SelectItem value="fryer">Fryer</SelectItem><SelectItem value="bar">Bar</SelectItem><SelectItem value="dessert">Dessert</SelectItem><SelectItem value="cold">Cold station</SelectItem></SelectContent></Select></div>

          <ModifierGroupBuilder groups={modifierGroups} onChange={setModifierGroups} />

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

          {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold">Menu item could not be saved</p><p className="mt-1 select-text break-words font-mono text-[11px] leading-5">{formError}</p></div><button type="button" onClick={() => navigator.clipboard.writeText(formError)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-[11px] font-bold hover:bg-rose-100"><Copy className="size-3" />Copy</button></div></div>}

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
              disabled={isSubmitting || !categories.length}
              id="btn-save-menu-item"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              {isSubmitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving…' : item ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
