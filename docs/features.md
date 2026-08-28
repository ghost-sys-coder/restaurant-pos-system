# Restaurant POS System - Features

## Core Modules

### 1. POS Register

- **Menu Catalog** with category filter chips and real-time search
- **Order Cart** (Current Ticket) with live subtotal, tax, tip, and total calculations
- **Multiple Order Types**: Dine-In, Takeout, Bar, Delivery
- **Item Customization Modal** with option groups, quantity controls, and kitchen instructions/notes
- **Quick Actions**: Send to Kitchen (KDS) or Pay & Settle directly

### 2. Table Management (Floor Plan)

- **Visual Table Grid** organized by dining sections (Main Dining, Patio, Bar, VIP)
- **Table Statuses**: Available, Occupied, Reserved, Cleaning, Billing
- **Real-time Metrics**: Available count, occupied count, billing count, total seat capacity
- **Table Actions**: Seat & Take Order, Open Active Order, Set Billing, Mark Clean & Ready, Arrive & Open Ticket
- **Add Table Modal** for creating new tables with number, capacity, and section

### 3. Kitchen Display System (KDS)

- **Live Order Queue** with real-time filtering (All Active, New, Cooking, Ready)
- **Item-level Status Tracking**: Sent → Preparing → Ready → Served/Void
- **Elapsed Timer** per ticket with visual urgency states (normal, warning at 10m, urgent at 20m)
- **Bump Order Flow**: Start Preparing → Order Ready → Mark Served/Complete
- **Kitchen Audio Chime** on new orders and test bell button

### 4. Order History & Transactions

- **Searchable Order Table** with order number, customer, and table filters
- **Status Filter Tabs**: All Orders, Active/Unsettled, Completed & Paid, Voided/Cancelled
- **Order Actions**: Print/View Receipt, Re-open into POS Ticket, Void/Cancel Order
- **Full Audit Trail** with timestamps, payment methods, and item summaries

### 5. Payments & Checkout

- **Multiple Payment Methods**: Credit Card, Cash, Digital Wallet (Apple/Google Pay), Split Bill
- **Card Terminal Simulator** with EMV/contactless reader ready UI
- **Cash Calculator** with fast tender buttons (Exact, $20, $50, $100) and change due display
- **Split Bill Modal** (2–6 ways) with per-guest payment tracking and settlement status
- **Payment Success Animation** with confetti burst and automatic receipt generation

### 6. Receipts

- **Thermal Receipt Modal** with restaurant header, order meta, itemized list, and totals breakdown
- **Simulated Barcode** for order lookup
- **Print Support** via browser print dialog

### 7. Reports & Analytics (Daily Z-Report)

- **KPI Cards**: Gross Sales, Net Revenue, Tax Collected, Staff Tips, Average Ticket
- **Tender Mix Breakdown**: Card, Cash In Drawer, Digital Wallets with progress bars
- **Top Selling Menu Items** ranked by revenue with portion counts
- **Print Z-Report** for end-of-day reconciliation

### 8. Menu & Catalog Management

- **Full CRUD** for menu items and categories
- **Item Fields**: Name, category, price, description, image URL, prep time, calories, allergens
- **86'd (Sold Out) Toggle** to mark items unavailable in real-time
- **Delete & Edit** actions with instant catalog refresh

### 9. Staff & Authentication

- **Clerk authentication** with server-side user sync
- **Clerk-managed staff identities** with server-enforced roles
- **Role-based Profiles**: Admin, Manager, Cashier, Waiter, Kitchen
- **Demo Staff Presets** for quick terminal access

### 10. UX & Operational Features

- **Auto-refresh Polling** every 10 seconds for tables and orders
- **Sound Effects**: Add-to-cart beep, kitchen order chime, payment success chime
- **Toast Notifications** for all major actions (order sent, payment processed, table updated)
- **Responsive Layout** optimized for tablet and desktop POS terminals
- **Loading State** with "Connecting to Cloud SQL POS Database..." indicator

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Express + Vite middleware mode
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Clerk React + Clerk Express
- **Animations**: Motion library + canvas-confetti
