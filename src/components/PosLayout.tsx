import { usePos } from '../context/PosContext.tsx';
import Navbar from './Navbar.tsx';
import PosRegisterView from './PosRegisterView.tsx';
import TableManagementView from './TableManagementView.tsx';
import KitchenDisplayView from './KitchenDisplayView.tsx';
import OrdersListView from './OrdersListView.tsx';
import ReportsView from './ReportsView.tsx';
import MenuManagementView from './MenuManagementView.tsx';
import ItemCustomizeModal from './ItemCustomizeModal.tsx';
import PaymentModal from './PaymentModal.tsx';
import ReceiptModal from './ReceiptModal.tsx';
import NotificationToast from './NotificationToast.tsx';

export default function PosLayout() {
  const { activeView, isLoading } = usePos();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Active View */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-50">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Connecting to Cloud SQL POS Database...</p>
          </div>
        ) : (
          <>
            {activeView === 'register' && <PosRegisterView />}
            {activeView === 'tables' && <TableManagementView />}
            {activeView === 'kds' && <KitchenDisplayView />}
            {activeView === 'orders' && <OrdersListView />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'menu_manager' && <MenuManagementView />}
          </>
        )}
      </main>

      {/* Global Modals & Overlays */}
      <ItemCustomizeModal />
      <PaymentModal />
      <ReceiptModal />
      <NotificationToast />
    </div>
  );
}
