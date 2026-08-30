import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  ActiveView,
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderType,
  RestaurantTable,
} from '../types.ts';
import { playBeep, playKitchenChime, playSuccessChime } from '../utils/sound.ts';
import { formatCurrency, setCurrency } from '../utils/formatters.ts';
import { useAuth } from './AuthContext.tsx';

export interface CartItem extends OrderItem {
  cartItemId: string;
}

export interface OrderConflict {
  expectedVersion: number;
  actualVersion: number;
  latestOrder: Order;
}
export interface ManagerApprovalPrompt { action: string; entityId?: string; message: string; resolve: (token: string | null) => void }

interface PosContextType {
  connectionState: 'online' | 'degraded' | 'offline';
  lastSyncedAt: Date | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  categories: Category[];
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: Order[];
  selectedCategory: number | null;
  setSelectedCategory: (catId: number | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Cart & Active Ticket
  cartItems: CartItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  selectedTableId: number | null;
  setSelectedTableId: (id: number | null) => void;
  guestCount: number;
  setGuestCount: (count: number) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  discountPercent: number;
  setDiscountPercent: (percent: number) => void;
  tipPercent: number;
  setTipPercent: (percent: number) => void;
  customTipCents: number;
  setCustomTipCents: (cents: number) => void;
  // Cart Actions
  addToCart: (item: MenuItem, options?: string, notes?: string, quantity?: number) => void;
  updateCartItemQty: (cartItemId: string, delta: number) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  loadOrderToCart: (order: Order) => void;
  checkoutOrder: Order | null;
  setCheckoutOrder: (order: Order | null) => void;
  openOrderForPayment: (order: Order) => void;
  // Totals
  subtotal: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
  // Backend Operations
  fetchData: () => Promise<void>;
  submitOrder: () => Promise<Order | null>;
  orderConflict: OrderConflict | null;
  dismissOrderConflict: () => void;
  loadLatestOrderAfterConflict: () => void;
  updateOrderStatus: (orderId: number, status: string) => Promise<void>;
  updateOrderItemStatus: (itemId: number, status: string, voidReason?: string) => Promise<void>;
  processPayment: (orderId: number, amount: number, method: string, tipAmount?: number, tenderedAmount?: number, idempotencyKey?: string) => Promise<Order | null>;
  // Modals & Active Targets
  activeCustomizingItem: MenuItem | null;
  setActiveCustomizingItem: (item: MenuItem | null) => void;
  paymentModalOpen: boolean;
  setPaymentModalOpen: (open: boolean) => void;
  splitBillModalOpen: boolean;
  setSplitBillModalOpen: (open: boolean) => void;
  receiptModalOpen: boolean;
  setReceiptModalOpen: (open: boolean) => void;
  activeReceiptOrder: Order | null;
  setActiveReceiptOrder: (order: Order | null) => void;
  staffModalOpen: boolean;
  setStaffModalOpen: (open: boolean) => void;
  addTableModalOpen: boolean;
  setAddTableModalOpen: (open: boolean) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  toastMessage: string | null;
  toastKind: 'success' | 'error' | 'info';
  showToast: (msg: string) => void;
  dismissToast: () => void;
  approvalPrompt: ManagerApprovalPrompt | null;
  requestManagerApproval: (action: string, entityId: string | undefined, message: string) => Promise<string | null>;
  closeManagerApproval: (token: string | null) => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const { currentUser, terminal } = useAuth();
  const [approvalPrompt, setApprovalPrompt] = useState<ManagerApprovalPrompt | null>(null);
  const requestManagerApproval = (action: string, entityId: string | undefined, message: string) => new Promise<string | null>(resolve => setApprovalPrompt({ action, entityId, message, resolve }));
  const closeManagerApproval = (token: string | null) => { setApprovalPrompt(current => { current?.resolve(token); return null; }); };
  const [activeView, setActiveView] = useState<ActiveView>(currentUser?.role === 'kitchen' ? 'kds' : currentUser?.role === 'accountant' ? 'reports' : 'register');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [taxRateBps, setTaxRateBps] = useState(0);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTipCents, setCustomTipCents] = useState<number>(0);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [orderConflict, setOrderConflict] = useState<OrderConflict | null>(null);

  // Modals & UI State
  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [splitBillModalOpen, setSplitBillModalOpen] = useState<boolean>(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [staffModalOpen, setStaffModalOpen] = useState<boolean>(false);
  const [addTableModalOpen, setAddTableModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'success' | 'error' | 'info'>('info');
  const toastTimer = useRef<number | null>(null);
  const [connectionState, setConnectionState] = useState<'online' | 'degraded' | 'offline'>(navigator.onLine ? 'online' : 'offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const draftKey = terminal && currentUser ? `vc:draft:${terminal.id}:${currentUser.id}` : null;
  useEffect(() => {
    if (!draftKey) return;
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (!draft) return;
      setCartItems(Array.isArray(draft.cartItems) ? draft.cartItems : []);
      setOrderType(draft.orderType || 'dine-in'); setSelectedTableId(draft.selectedTableId ?? null);
      setGuestCount(draft.guestCount || 1); setCustomerName(draft.customerName || ''); setCustomerPhone(draft.customerPhone || '');
      setOrderNotes(draft.orderNotes || ''); setDiscountPercent(draft.discountPercent || 0); setEditingOrder(draft.editingOrder || null);
    } catch { localStorage.removeItem(draftKey); }
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey) return;
    if (!cartItems.length) { localStorage.removeItem(draftKey); return; }
    localStorage.setItem(draftKey, JSON.stringify({ cartItems, orderType, selectedTableId, guestCount, customerName, customerPhone, orderNotes, discountPercent, editingOrder }));
  }, [draftKey, cartItems, orderType, selectedTableId, guestCount, customerName, customerPhone, orderNotes, discountPercent, editingOrder]);

  const showToast = (msg: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const isError = /error|failed|unable|incorrect|invalid|cannot|could not|conflict|offline/i.test(msg);
    const isSuccess = /added|created|saved|updated|sent|processed successfully|cancelled|reserved|moved|ready/i.test(msg) && !isError;
    setToastKind(isError ? 'error' : isSuccess ? 'success' : 'info');
    setToastMessage(msg);
    if (!isError) toastTimer.current = window.setTimeout(() => setToastMessage(null), 3500);
  };
  const dismissToast = () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); setToastMessage(null); };
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const fetchData = async () => {
    try {
      const [catsRes, itemsRes, tablesRes, ordersRes, configRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu-items'),
        fetch('/api/tables'),
        fetch('/api/orders'),
        fetch('/api/config'),
      ]);

      if (![catsRes, itemsRes, tablesRes, ordersRes, configRes].every(response => response.ok)) throw new Error('Some POS data could not be refreshed');
      if (catsRes.ok) setCategories(await catsRes.json());
      if (itemsRes.ok) setMenuItems(await itemsRes.json());
      if (tablesRes.ok) setTables(await tablesRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (configRes.ok) { const config = await configRes.json(); setTaxRateBps(config.taxRateBps || 0); setCurrency(config.currency || 'UGX'); }
      setConnectionState('online');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Failed to load POS data:', err);
      setConnectionState(navigator.onLine ? 'degraded' : 'offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const online = () => { setConnectionState('degraded'); void fetchData(); };
    const offline = () => setConnectionState('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let delay = 10_000;
    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden') { timer = window.setTimeout(poll, 30_000); return; }
      try {
        const [tablesRes, ordersRes] = await Promise.all([
          fetch('/api/tables'),
          fetch('/api/orders'),
        ]);
        if (tablesRes.ok) setTables(await tablesRes.json());
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (!tablesRes.ok || !ordersRes.ok) throw new Error('Background refresh failed');
        setConnectionState('online'); setLastSyncedAt(new Date());
        delay = 10_000;
      } catch { setConnectionState(navigator.onLine ? 'degraded' : 'offline'); delay = Math.min(delay * 2, 60_000); }
      timer = window.setTimeout(poll, delay);
    };
    timer = window.setTimeout(poll, delay);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  // Cart Totals Calculation
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.round((subtotal * discountPercent) / 100);
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableSubtotal * taxRateBps / 10_000);
  const tip = customTipCents > 0 ? customTipCents : Math.round((taxableSubtotal * tipPercent) / 100);
  const total = taxableSubtotal + tax + tip;

  const addToCart = (item: MenuItem, options?: string, notes?: string, quantity: number = 1) => {
    playBeep(750, 0.05);
    const cartItemId = `${item.id}-${options || ''}-${notes || ''}-${Date.now()}`;
    
    // Check if exact same item and modifier exists
    const existingIndex = cartItems.findIndex(
      ci => ci.menuItemId === item.id && ci.selectedOptions === (options || null) && ci.notes === (notes || null)
    );

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += quantity;
      setCartItems(updated);
    } else {
      setCartItems(prev => [
        ...prev,
        {
          cartItemId,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity,
          selectedOptions: options || null,
          notes: notes || null,
          itemStatus: 'sent',
        },
      ]);
    }
    showToast(`Added ${item.name} to order`);
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    playBeep(520, 0.04);
    setCartItems(prev =>
      prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (cartItemId: string) => {
    playBeep(400, 0.05);
    setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedTableId(null);
    setCustomerName('');
    setCustomerPhone('');
    setOrderNotes('');
    setDiscountPercent(0);
    setTipPercent(0);
    setCustomTipCents(0);
    setEditingOrder(null);
  };

  const loadOrderToCart = (order: Order) => {
    if (!order.items) return;
    setOrderType(order.orderType);
    setSelectedTableId(order.tableId);
    setGuestCount(order.guestCount || 1);
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setOrderNotes(order.notes || '');
    setCartItems(
      order.items.map((it, idx) => ({
        cartItemId: `loaded-${it.id || idx}-${Date.now()}`,
        menuItemId: it.menuItemId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        selectedOptions: it.selectedOptions,
        notes: it.notes,
        itemStatus: it.itemStatus,
      }))
    );
    setEditingOrder(order);
    setActiveView('register');
    showToast(`Loaded Order ${order.orderNumber}`);
  };

  const submitOrder = async (): Promise<Order | null> => {
    if (cartItems.length === 0) return null;
    setIsSubmitting(true);
    try {
      const send = (approvalToken?: string) => fetch(editingOrder ? `/api/orders/${editingOrder.id}` : '/api/orders', {
        method: editingOrder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(approvalToken ? { 'x-manager-approval': approvalToken } : {}) },
        body: JSON.stringify({
          orderType,
          tableId: orderType === 'dine-in' ? selectedTableId : null,
          serverName: 'Staff Member',
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          discountPercent,
          tipAmount: tip,
          expectedVersion: editingOrder?.version,
          notes: orderNotes || null,
          guestCount,
          items: cartItems.map(ci => ({
            menuItemId: ci.menuItemId,
            quantity: ci.quantity,
            selectedOptions: ci.selectedOptions || undefined,
            notes: ci.notes || undefined,
          })),
        }),
      });
      let res = await send();
      if (res.status === 428) {
        const required = await res.json().catch(() => ({}));
        const token = await requestManagerApproval(required.action || 'order.discount', required.entityId, required.error || 'Manager approval required');
        if (!token) return null;
        res = await send(token);
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Order creation failed' }));
        if (res.status === 409 && errorData.code === 'ORDER_CONFLICT' && errorData.latestOrder) {
          setOrderConflict({
            expectedVersion: Number(errorData.expectedVersion),
            actualVersion: Number(errorData.actualVersion),
            latestOrder: errorData.latestOrder as Order,
          });
          return null;
        }
        throw new Error(errorData.error || 'Order creation failed');
      }
      const createdOrder = await res.json();
      playKitchenChime();
      showToast(`Order ${createdOrder.orderNumber} ${editingOrder ? 'updated' : 'sent to Kitchen & KDS'}!`);
      setCheckoutOrder(createdOrder);
      clearCart();
      await fetchData();
      return createdOrder;
    } catch (err: any) {
      console.error('Submit order error:', err);
      showToast('Error placing order: ' + err.message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissOrderConflict = () => setOrderConflict(null);
  const loadLatestOrderAfterConflict = () => {
    if (!orderConflict) return;
    loadOrderToCart(orderConflict.latestOrder);
    setOrderConflict(null);
    showToast(`Loaded the latest ${orderConflict.latestOrder.orderNumber}. Review it before saving.`);
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const send = (approvalToken?: string) => fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(approvalToken ? { 'x-manager-approval': approvalToken } : {}) },
        body: JSON.stringify({ status }),
      });
      let res = await send();
      if (res.status === 428) {
        const required = await res.json().catch(() => ({}));
        const token = await requestManagerApproval(required.action || 'order.cancel', required.entityId || String(orderId), required.error || 'Manager approval required');
        if (!token) return;
        res = await send(token);
      }
      if (res.ok) {
        showToast(`Order status updated to ${status}`);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const updateOrderItemStatus = async (itemId: number, status: string, voidReason?: string) => {
    try {
      const send = (approvalToken?: string) => fetch(`/api/orders/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(approvalToken ? { 'x-manager-approval': approvalToken } : {}) },
        body: JSON.stringify({ status, voidReason }),
      });
      let res = await send();
      if (res.status === 428) {
        const required = await res.json().catch(() => ({}));
        const token = await requestManagerApproval(required.action || 'order.item_void', required.entityId || String(itemId), required.error || 'Manager approval required');
        if (!token) return;
        res = await send(token);
      }
      if (res.ok) {
        await fetchData();
      } else {
        const body = await res.json().catch(() => ({})); throw new Error(body.error || 'Unable to update kitchen item');
      }
    } catch (err: any) {
      console.error('Failed to update item status:', err);
      showToast(err.message || 'Unable to update kitchen item');
    }
  };

  const processPayment = async (orderId: number, amount: number, method: string, tipAmount = 0, tenderedAmount?: number, idempotencyKey = crypto.randomUUID()): Promise<Order | null> => {
    setIsSubmitting(true);
    try {
      const provider = method === 'cash' ? 'cash' : method;
      const res = await fetch('/api/payment-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: amount + tipAmount,
          provider,
          tenderedAmount,
          idempotencyKey,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Payment processing failed' }));
        throw new Error(errorData.error || 'Payment processing failed');
      }
      const paymentResult = await res.json();
      const updatedOrder = paymentResult.order as Order;
      setCheckoutOrder(updatedOrder);
      playSuccessChime();
      showToast(`Payment of ${formatCurrency(amount)} processed successfully!`);
      await fetchData();
      return updatedOrder;
    } catch (err: any) {
      console.error('Payment error:', err);
      showToast('Payment failed: ' + err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOrderForPayment = (order: Order) => {
    setCheckoutOrder(order);
    setPaymentModalOpen(true);
  };

  return (
    <PosContext.Provider
      value={{
        connectionState,
        lastSyncedAt,
        activeView,
        setActiveView,
        categories,
        menuItems,
        tables,
        orders,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        cartItems,
        orderType,
        setOrderType,
        selectedTableId,
        setSelectedTableId,
        guestCount,
        setGuestCount,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        orderNotes,
        setOrderNotes,
        discountPercent,
        setDiscountPercent,
        tipPercent,
        setTipPercent,
        customTipCents,
        setCustomTipCents,
        addToCart,
        updateCartItemQty,
        removeCartItem,
        clearCart,
        loadOrderToCart,
        checkoutOrder,
        setCheckoutOrder,
        openOrderForPayment,
        subtotal,
        tax,
        discount,
        tip,
        total,
        fetchData,
        submitOrder,
        orderConflict,
        dismissOrderConflict,
        loadLatestOrderAfterConflict,
        updateOrderStatus,
        updateOrderItemStatus,
        processPayment,
        activeCustomizingItem,
        setActiveCustomizingItem,
        paymentModalOpen,
        setPaymentModalOpen,
        splitBillModalOpen,
        setSplitBillModalOpen,
        receiptModalOpen,
        setReceiptModalOpen,
        activeReceiptOrder,
        setActiveReceiptOrder,
        staffModalOpen,
        setStaffModalOpen,
        addTableModalOpen,
        setAddTableModalOpen,
        isLoading,
        isSubmitting,
        toastMessage,
        toastKind,
        showToast,
        dismissToast,
        approvalPrompt,
        requestManagerApproval,
        closeManagerApproval,
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
