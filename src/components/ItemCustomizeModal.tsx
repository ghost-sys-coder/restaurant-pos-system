import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import { MenuOptionGroup, OptionChoice } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { X, Plus, Minus, Check } from 'lucide-react';

export default function ItemCustomizeModal() {
  const { activeCustomizingItem, setActiveCustomizingItem, addToCart } = usePos();
  const [selectedChoices, setSelectedChoices] = useState<Record<string, OptionChoice>>({});
  const [cookingNotes, setCookingNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

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
  const addOnsTotal = (Object.values(selectedChoices) as OptionChoice[]).reduce(
    (sum, c) => sum + (c?.price || 0),
    0
  );
  const finalUnitPrice = activeCustomizingItem.price + addOnsTotal;

  const handleSelectChoice = (groupName: string, choice: OptionChoice) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [groupName]: choice,
    }));
  };

  const handleConfirm = () => {
    const optionsSummary = (Object.entries(selectedChoices) as [string, OptionChoice][])
      .map(([group, choice]) => `${group}: ${choice?.name || ''}`)
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
            onClick={() => setActiveCustomizingItem(null)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
          {optionGroups.map((group) => (
            <div key={group.name} className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {group.name}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {group.choices.map((choice) => {
                  const isSelected = selectedChoices[group.name]?.name === choice.name;
                  return (
                    <button
                      key={choice.name}
                      type="button"
                      onClick={() => handleSelectChoice(group.name, choice)}
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
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-between cursor-pointer shadow-xs"
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
