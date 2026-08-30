import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { MenuOptionGroup, OptionChoice } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';

export default function ItemCustomizeModal() {
  const { activeCustomizingItem, setActiveCustomizingItem, addToCart } = usePos();
  const [selectedChoices, setSelectedChoices] = useState<Record<string, OptionChoice[]>>({});
  const [cookingNotes, setCookingNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectionError, setSelectionError] = useState('');

  if (!activeCustomizingItem) return null;

  let optionGroups: MenuOptionGroup[] = [];
  try {
    if (activeCustomizingItem.optionsJson) {
      optionGroups = JSON.parse(activeCustomizingItem.optionsJson);
    }
  } catch (e) {
    optionGroups = [];
  }

  // Calculate customized unit price
  const addOnsTotal = Object.values(selectedChoices).flat().reduce(
    (sum, c) => sum + (c?.price || 0),
    0
  );
  const finalUnitPrice = activeCustomizingItem.price + addOnsTotal;

  const handleSelectChoice = (group: MenuOptionGroup, choice: OptionChoice) => {
    setSelectionError('');
    setSelectedChoices(prev => {
      const current = prev[group.name] || [];
      const selected = current.some(value => value.name === choice.name);
      const max = group.maxSelections ?? 1;
      const next = selected ? current.filter(value => value.name !== choice.name) : max === 1 ? [choice] : current.length < max ? [...current, choice] : current;
      return { ...prev, [group.name]: next };
    });
  };

  const handleConfirm = () => {
    const invalid = optionGroups.find(group => (selectedChoices[group.name] || []).length < (group.minSelections ?? 0));
    if (invalid) { setSelectionError(`Choose at least ${invalid.minSelections ?? 1} option${(invalid.minSelections ?? 1) === 1 ? '' : 's'} for “${invalid.name}”.`); return; }
    const optionsSummary = Object.entries(selectedChoices)
      .flatMap(([group, choices]) => choices.map(choice => `${group}: ${choice.name}`))
      .join(', ');

    addToCart(
      {
        ...activeCustomizingItem,
        price: finalUnitPrice,
      },
      optionsSummary || undefined,
      cookingNotes.trim() || undefined,
      quantity
    );

    setActiveCustomizingItem(null);
    setSelectedChoices({});
    setCookingNotes('');
    setQuantity(1);
    setSelectionError('');
  };

  const close = () => {
    setActiveCustomizingItem(null);
    setSelectedChoices({});
    setCookingNotes('');
    setQuantity(1);
    setSelectionError('');
  };

  return (
    <div
      id="item-customize-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">{activeCustomizingItem.name}</h3>
            <p className="text-xs text-indigo-600 font-semibold">
              Base: {formatCurrency(activeCustomizingItem.price)}
            </p>
          </div>
          <button
            id="close-customize-modal"
            onClick={close}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
          {optionGroups.map((group) => (
            <div key={group.name} className="space-y-2">
              <div className="flex items-center justify-between gap-3"><label className="text-sm font-bold text-slate-800">{group.name}</label><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${(group.minSelections ?? 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{(group.minSelections ?? 0) > 0 ? 'Required' : 'Optional'}</span></div>
              <p className="text-[11px] text-slate-500">{(group.maxSelections ?? 1) === 1 ? 'Choose one option.' : `Choose up to ${group.maxSelections ?? 1}.`} {(selectedChoices[group.name] || []).length > 0 && <strong className="text-indigo-600">{(selectedChoices[group.name] || []).length} selected</strong>}</p>
              <label className="sr-only">
                {group.name} <span className="font-normal normal-case text-slate-400">({group.minSelections ?? 0}–{group.maxSelections ?? 1})</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {group.choices.map((choice) => {
                  const isSelected = (selectedChoices[group.name] || []).some(value => value.name === choice.name);
                  return (
                    <button
                      key={choice.name}
                      type="button"
                      onClick={() => handleSelectChoice(group, choice)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{choice.name}</span>
                      </div>
                      {choice.price > 0 && (
                        <span className="text-indigo-600 font-mono font-bold">
                          +{formatCurrency(choice.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Kitchen / Special Request Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Kitchen Instructions / Allergies
            </label>
            <input
              type="text"
              id="input-customize-notes"
              value={cookingNotes}
              onChange={(e) => setCookingNotes(e.target.value)}
              placeholder="e.g. Dressing on the side, extra crispy, no garlic"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
          {selectionError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />{selectionError}</div>}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-2xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-800">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Button */}
          <button
            id="btn-confirm-customization"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-between cursor-pointer shadow-xs"
          >
            <span>Add to Order</span>
            <span className="font-extrabold font-mono text-sm">
              {formatCurrency(finalUnitPrice * quantity)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
