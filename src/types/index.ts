export interface User {
  _id: string
  email: string
  name: string
  role: "admin" | "manager"
  createdAt: Date
}

export interface OrderItem {
  name: string
  quantity: number
  price: number
}

export interface IncomeRecord {
  _id: string
  tableNumber?: string
  customerName?: string
  items: OrderItem[]
  totalAmount: number
  paymentMethod: "cash" | "digital"
  paymentStatus: "pending" | "completed"
  date: Date
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseRecord {
  _id: string
  amount: number
  category: string
  vendor?: string
  description: string
  date: Date
  receiptNumber?: string
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  ordersCount: number
  expensesCount: number
  averageOrderValue: number
  pendingPaymentsCount: number
}

export interface ChartData {
  date: string
  income: number
  expenses: number
  profit: number
  orders: number
}

export type DateFilter = "today" | "week" | "month" | "custom"

export interface FilterOptions {
  dateFilter: DateFilter
  category?: string
  startDate?: Date
  endDate?: Date
}
