export type PlatformRole = 'platform_owner' | 'platform_support' | 'platform_billing';
export type BackOfficeRole = 'restaurant_owner' | 'restaurant_admin' | 'general_manager' | 'accountant';
export type OperationalRole = 'shift_manager' | 'cashier' | 'server' | 'bartender' | 'host' | 'kitchen';
export type Role = BackOfficeRole | OperationalRole;

export const BACK_OFFICE_ROLES: BackOfficeRole[] = ['restaurant_owner', 'restaurant_admin', 'general_manager', 'accountant'];
export const OPERATIONAL_ROLES: OperationalRole[] = ['shift_manager', 'cashier', 'server', 'bartender', 'host', 'kitchen'];
export const RESTAURANT_ROLES: Role[] = [...BACK_OFFICE_ROLES, ...OPERATIONAL_ROLES];

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'billing';
export type OrderType = 'dine-in' | 'takeout' | 'delivery' | 'bar';
export type OrderStatus = 'pending' | 'active' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'digital' | 'split';
export type ItemStatus = 'sent' | 'preparing' | 'ready' | 'served' | 'void';

export interface User {
  id: number;
  clerkUserId?: string | null;
  email?: string | null;
  name: string | null;
  role: Role;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt?: string;
}

export interface OptionChoice {
  name: string;
  price: number; // in cents
}

export interface MenuOptionGroup {
  name: string;
  choices: OptionChoice[];
  minSelections?: number;
  maxSelections?: number;
  kitchenLabel?: string;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number; // cents
  imageUrl: string | null;
  imagePublicId?: string | null;
  isAvailable: boolean;
  calories: number | null;
  prepTimeMinutes: number;
  allergens: string | null;
  optionsJson: string | null;
  createdAt?: string;
}

export interface RestaurantTable {
  id: number;
  tableNumber: string;
  capacity: number;
  section: string;
  status: TableStatus;
  currentOrderId: number | null;
  posX: number;
  posY: number;
  createdAt?: string;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  menuItemId?: number;
  name: string;
  price: number; // cents
  quantity: number;
  selectedOptions?: string | null;
  notes?: string | null;
  itemStatus?: ItemStatus;
  createdAt?: string;
}

export interface Payment {
  id?: number;
  orderId: number;
  amount: number; // cents
  tip?: number; // cents
  method: PaymentMethod;
  transactionRef?: string | null;
  status: string;
  processedBy?: string | null;
  createdAt?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  tableId: number | null;
  serverName: string;
  customerName: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  currency: string;
  taxRateBps: number;
  discountRateBps: number;
  subtotal: number; // integer minor units; whole shillings for UGX
  tax: number;
  discount: number;
  tip: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  guestCount: number;
  createdAt: string;
  completedAt: string | null;
  version: number;
  items?: OrderItem[];
  table?: RestaurantTable | null;
  payments?: Payment[];
}

export type ActiveView = 'register' | 'tables' | 'kds' | 'orders' | 'reports' | 'menu_manager' | 'settings';
