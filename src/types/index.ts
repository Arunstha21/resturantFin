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

export interface User {
  _id: string
  name: string
  email: string
  role: "admin" | "manager"
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

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

export interface ChartData {
  date: string
  income: number
  expenses: number
  profit: number
  orders: number
}

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

export interface DueAccountSummary {
  _id: string
  customerName: string
  customerPhone?: string
  totalDueAmount: number
  pendingOrdersCount: number
  lastOrderDate: Date | string
  orders: IncomeRecord[]
}

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