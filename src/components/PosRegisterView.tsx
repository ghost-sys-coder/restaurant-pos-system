import { useState } from 'react';
import { usePos } from '../context/PosContext.tsx';
import CategoryFilterBar from './CategoryFilterBar.tsx';
import MenuItemCard from './MenuItemCard.tsx';
import OrderCartPanel from './OrderCartPanel.tsx';
import { Search, X, Flame, ShoppingBag } from 'lucide-react';

export default function PosRegisterView() {
  const { menuItems, selectedCategory, searchQuery, setSearchQuery } = usePos();
  const [cartOpen, setCartOpen] = useState(false);

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === null || item.categoryId === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div
      id="pos-register-view"
      className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50 text-slate-900"
    >
      {/* Left: Menu Catalog Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 lg:p-6">
        {/* Search & Category Header */}
        <div className="shrink-0 space-y-3 lg:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search bar */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-pos-menu-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, drinks, appetizers, pasta..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  id="clear-menu-search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700">{filteredItems.length}</span> items
              available
            </div>
          </div>

          {/* Category Filter Chips Bar */}
          <CategoryFilterBar />
        </div>

        {/* Menu Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 mt-4 lg:mt-0">
          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Flame className="w-10 h-10 opacity-30 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-600">No menu items found</p>
              <p className="text-xs text-slate-400">
                Try searching for something else or clearing category filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-3.5 pb-6">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Toggle */}
      <button
        id="btn-mobile-cart-toggle"
        onClick={() => setCartOpen(!cartOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-bold text-xs uppercase tracking-wider cursor-pointer"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Cart</span>
      </button>

      {/* Right: Live Cart / Order Ticket Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 bg-white lg:static lg:bg-transparent lg:z-auto lg:h-full lg:flex lg:flex-col lg:min-h-0 transition-all duration-300 ${
          cartOpen ? 'block' : 'hidden lg:flex'
        }`}
      >
        <div
          className={`h-[85vh] lg:h-full lg:flex lg:flex-col lg:min-h-0 ${
            cartOpen ? 'animate-in slide-in-from-bottom duration-200' : ''
          }`}
        >
          <OrderCartPanel />
        </div>
      </div>
    </div>
  );
}
