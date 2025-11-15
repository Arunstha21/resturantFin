import mongoose, { Schema, Document, models } from "mongoose";

export interface IOrderItem {
  name: string
  quantity: number
  category?: string
  price: number
  menuItemId?: mongoose.Types.ObjectId
}

export interface IIncomeRecord extends Document {
  tableNumber?: string
  customerName?: string
  items: IOrderItem[]
  discount: number
  tip: number
  subtotal: number
  totalAmount: number
  paymentMethod: "cash" | "digital" | "split"
  paymentStatus: "pending" | "completed"
  cashAmount?: number
  digitalAmount?: number
  date: Date
  notes?: string
  organization: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  isDueAccount?: boolean
  dueAccountId?: string
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>({
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  category: {
    type: String,
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
  },
})

const IncomeRecordSchema = new Schema<IIncomeRecord>(
  {
    tableNumber: {
      type: String,
    },
    customerName: {
      type: String,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "At least one item is required",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tip: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "digital", "split"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    cashAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    digitalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDueAccount: { type: Boolean, default: false },
    dueAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DueAccount",
    },
  },
  {
    timestamps: true,
  },
)

export default models.IncomeRecord || mongoose.model<IIncomeRecord>("IncomeRecord", IncomeRecordSchema)
