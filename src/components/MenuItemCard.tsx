import { usePos } from '../context/PosContext.tsx';
import { MenuItem } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { Plus, SlidersHorizontal, Flame, Clock } from 'lucide-react';

export default function MenuItemCard({ item }: { item: MenuItem }) {
  const { addToCart, setActiveCustomizingItem } = usePos();

  const hasOptions = item.optionsJson && item.optionsJson !== '[]';

  const handleCardClick = () => {
    if (!item.isAvailable) return;
    if (hasOptions) {
      setActiveCustomizingItem(item);
    } else {
      addToCart(item);
    }
  };

  return (
    <div
      id={`menu-card-${item.id}`}
      onClick={handleCardClick}
      className={`group relative bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md text-slate-800 overflow-hidden ${
        item.isAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed bg-slate-50'
      }`}
    >
      <div>
        {/* Image / Header */}
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3 bg-slate-100 border border-slate-100">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Flame className="w-8 h-8 opacity-40 text-indigo-400" />
            </div>
          )}

          {/* Prep Time Badge */}
          {item.prepTimeMinutes > 0 && (
            <span className="absolute top-2 left-2 flex items-center gap-1 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-indigo-300" />
              {item.prepTimeMinutes}m
            </span>
          )}

          {/* Unavailable overlay */}
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider px-2 py-1 bg-white rounded border border-rose-200 shadow-sm">
                Sold Out
              </span>
            </div>
          )}

          {/* Price Tag */}
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-indigo-600 font-extrabold text-xs sm:text-sm border border-slate-200 shadow-xs font-mono">
            {formatCurrency(item.price)}
          </div>
        </div>

        {/* Title & Description */}
        <h4 className="font-bold text-sm text-slate-800 leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {item.name}
        </h4>
        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      {/* Footer Info & Action */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1 truncate text-slate-500 text-[11px]">
          {item.calories ? `${item.calories} kcal` : ''}
          {item.calories && item.allergens ? ' · ' : ''}
          {item.allergens && (
            <span className="text-slate-400" title={item.allergens}>
              {item.allergens}
            </span>
          )}
        </div>

        {item.isAvailable && (
          <button
            id={`btn-add-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="shrink-0 whitespace-nowrap flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 font-bold transition-all text-xs cursor-pointer shadow-2xs"
          >
            {hasOptions ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
