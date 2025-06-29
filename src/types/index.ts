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
