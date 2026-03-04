// Centralized application constants
// IndexedDB collection names
export const COLLECTIONS = {
  INCOME: "income",
  EXPENSE: "expense",
  DUE_ACCOUNT: "dueAccount",
  MENU_ITEM: "menuItem",
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]

// Payment methods
export const PAYMENT_METHOD = {
  CASH: "cash",
  DIGITAL: "digital",
  SPLIT: "split",
} as const

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD]

// Payment status
export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

// User roles
export const USER_ROLE = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE]

// Cache revalidation path groups
export const REVALIDATE_PATHS = {
  MENU: ["/menu-management", "/menu", "/records"],
  DASHBOARD: ["/dashboard", "/dashboard/records"],
  DUE_ACCOUNTS: ["/due-accounts"],
  USERS: ["/users"],
} as const

// API endpoint paths
export const API_PATHS = {
  INCOME_RECORDS: "/api/income-records",
  EXPENSE_RECORDS: "/api/expense-records",
  DUE_ACCOUNTS: "/api/due-accounts",
  MENU_ITEMS: "/api/menu-items",
  USERS: "/api/users",
  ORGANIZATION: "/api/organization",
  DASHBOARD: "/api/dashboard",
} as const

// Query parameter names
export const QUERY_PARAMS = {
  AVAILABLE: "true",
  CATEGORY: "category",
  AVAILABLE_ONLY: "available",
  FOR_REPORT: "forReport",
  FILTER: "filter",
} as const

// Date filter options
export const DATE_FILTER = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
} as const

export type DateFilter = typeof DATE_FILTER[keyof typeof DATE_FILTER]

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  NOT_FOUND: "Record not found",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
} as const

// Temp ID prefix for offline records
export const TEMP_ID_PREFIX = "temp_"

export function generateTempId(): string {
  return `${TEMP_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX)
}
