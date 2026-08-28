import { usePos } from '../context/PosContext.tsx';
import {
  Utensils,
  Flame,
  Pizza,
  Soup,
  Salad,
  Cake,
  Wine,
  Coffee,
  Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Flame,
  Pizza,
  Soup,
  Salad,
  Cake,
  Wine,
  Coffee,
};

export default function CategoryFilterBar() {
  const { categories, selectedCategory, setSelectedCategory, menuItems } = usePos();

  return (
    <div
      id="category-filter-bar"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200"
    >
      {/* All Items Pill */}
      <button
        id="cat-pill-all"
        onClick={() => setSelectedCategory(null)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
          selectedCategory === null
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        <span>All Items</span>
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
            selectedCategory === null ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {menuItems.length}
        </span>
      </button>

      {/* Categories */}
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const IconComponent = ICON_MAP[cat.icon] || Utensils;
        const count = menuItems.filter((i) => i.categoryId === cat.id).length;

        return (
          <button
            key={cat.id}
            id={`cat-pill-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              isSelected
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <IconComponent className="w-3.5 h-3.5 shrink-0" />
            <span>{cat.name}</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
