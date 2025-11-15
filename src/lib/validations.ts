import { z } from "zod"

export const orderItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
})

export const incomeRecordSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      category: z.string().optional(),
      menuItemId: z.string().optional(),
    })
  ),
  subtotal: z.number().min(0, "Subtotal must be at least 0"),
  discount: z.number().min(0, "Discount must be at least 0"),
  tip: z.number().min(0, "Tip must be at least 0"),
  totalAmount: z.number(),
  paymentMethod: z.enum(["cash", "digital", "split"]),
  cashAmount: z.number().min(0, "Cash amount must be at least 0").optional(),
  digitalAmount: z.number().min(0, "Digital amount must be at least 0").optional(),
  paymentStatus: z.enum(["pending", "completed"]),
  date: z.date(),
  tableNumber: z.string().optional(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
  isDueAccount: z.boolean().optional(),
  dueAccountId: z
    .string()
    .optional()
    .transform((val) => {
      return val && val.trim() !== "" ? val : undefined
    }),
});

export const expenseRecordSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  vendor: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  date: z.date(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  shortName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean(),
})

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
  .union([z.string().min(6, "Password must be at least 6 characters"), z.literal("")])
  .optional(),
  organization: z.string().optional(),
  role: z.enum(["admin", "manager", "staff"]),
})

export const filterSchema = z.object({
  dateFilter: z.enum(["today", "week", "month", "custom"]),
  category: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})
export const dueAccountSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
})

export const duePaymentSchema = z.object({
  paymentAmount: z.number().min(0.01, "Payment amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "digital"], {
    required_error: "Please select a payment method",
  }),
})

export type DueAccountInput = z.infer<typeof dueAccountSchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
export type IncomeRecordInput = z.infer<typeof incomeRecordSchema>
export type ExpenseRecordInput = z.infer<typeof expenseRecordSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UserInput = z.infer<typeof userSchema>
export type FilterInput = z.infer<typeof filterSchema>
export type DuePaymentInput = z.infer<typeof duePaymentSchema>
export type OrganizationInput = z.infer<typeof organizationSchema>
