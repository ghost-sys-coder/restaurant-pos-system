import { usePos, CartItem } from '../context/PosContext.tsx';
import { formatCurrency } from '../utils/formatters.ts';
import { Plus, Minus, Trash2 } from 'lucide-react';

export default function OrderCartItemRow({ item }: { item: CartItem }) {
  const { updateCartItemQty, removeCartItem } = usePos();

  return (
    <div
      id={`cart-row-${item.cartItemId}`}
      className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-indigo-200 transition flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
          {item.selectedOptions && (
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5 line-clamp-1">
              {item.selectedOptions}
            </p>
          )}
          {item.notes && (
            <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
              "{item.notes}"
            </p>
          )}
        </div>
        <span className="text-xs font-extrabold font-mono text-slate-900 shrink-0">
          {formatCurrency(item.price * item.quantity)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
        <span className="text-[11px] text-slate-500 font-mono">
          {formatCurrency(item.price)} each
        </span>

        <div className="flex items-center gap-1.5">
          <button
            id={`cart-minus-${item.cartItemId}`}
            onClick={() => updateCartItemQty(item.cartItemId, -1)}
            className="w-6 h-6 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer shadow-2xs"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-6 text-center text-xs font-bold text-slate-800">
            {item.quantity}
          </span>
          <button
            id={`cart-plus-${item.cartItemId}`}
            onClick={() => updateCartItemQty(item.cartItemId, 1)}
            className="w-6 h-6 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            id={`cart-del-${item.cartItemId}`}
            onClick={() => removeCartItem(item.cartItemId)}
            className="w-6 h-6 ml-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
            title="Remove item"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
