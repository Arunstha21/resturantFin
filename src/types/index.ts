// Application type definitions
// Income/sales record
export interface IncomeRecord {
  _id: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
  subtotal: number
  discount?: number
  tip?: number
  paymentMethod: "cash" | "digital" | "split"
  paymentStatus: "pending" | "completed"
  cashAmount?: number
  digitalAmount?: number
  date: Date | string
  tableNumber?: string
  customerName?: string
  notes?: string
  createdBy: string
  isDueAccount?: boolean
  dueAccountId?: string
  createdAt: Date | string
  updatedAt: Date | string
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

// Expense record
export interface ExpenseRecord {
  _id: string
  amount: number
  category: string
  vendor?: string
  description: string
  date: Date | string
  receiptNumber?: string
  notes?: string
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

// System user
export interface User {
  _id: string
  name: string
  email: string
  role: "admin" | "manager" | "staff"
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

// Dashboard statistics
export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  ordersCount: number
  expensesCount: number
  averageOrderValue: number
  pendingPaymentsCount: number
  _fromCache?: boolean
}

// Chart data point
export interface ChartData {
  date: string
  income: number
  expenses: number
  profit: number
  orders: number
}

// Due account (customer credit)
export interface DueAccount {
  _id: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  totalDueAmount: number
  totalOrders: number
  pendingOrders: number
  lastOrderDate: Date | string
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  isActive: boolean
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

// Payment operation result
export interface PaymentResult {
  success: boolean
  paidAmount: number
  remainingPayment: number
}

// Due account with orders
export interface DueAccountSummary {
  _id: string
  customerName: string
  organization: string
  customerPhone?: string
  totalDueAmount: number
  pendingOrdersCount: number
  lastOrderDate: Date | string
  orders: IncomeRecord[]
}

// Menu item
export interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  category: string
  isAvailable: boolean
  image?: string
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

// Menu item with sales data (incomeCategory is "Popular" for top items)
export interface MenuItemWithSales {
  _id: string
  name: string
  category: string
  incomeCategory: string
  price: number
  image: string
  isAvailable: boolean
  totalSold: number
}

// Organization (tenant)
export interface Organization {
  _id: string
  name: string
  shortName?: string
  users: string[]
  address?: string
  phone?: string
  email?: string
  taxId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Organization with populated users
export interface OrganizationWithUsers {
  _id: string
  name: string
  shortName?: string
  users: User[]
  address?: string
  phone?: string
  email?: string
  taxId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
