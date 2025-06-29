import mongoose, { type Document, Schema } from "mongoose"

export interface IOrderItem {
  name: string
  quantity: number
  price: number
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
  createdBy: mongoose.Types.ObjectId
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.IncomeRecord || mongoose.model<IIncomeRecord>("IncomeRecord", IncomeRecordSchema)
