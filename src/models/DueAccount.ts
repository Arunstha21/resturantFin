import mongoose from "mongoose"

export interface IDueAccount extends Document {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  totalDueAmount: number
  totalOrders: number
  pendingOrders: number
  lastOrderDate: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  _offline?: boolean
  _localId?: string
  _timestamp?: number
}

const dueAccountSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    totalDueAmount: {
      type: Number,
      default: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    pendingOrders: {
      type: Number,
      default: 0,
    },
    lastOrderDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
dueAccountSchema.index({ customerName: 1, isActive: 1 })
dueAccountSchema.index({ createdBy: 1 })

export default mongoose.models.DueAccount || mongoose.model<IDueAccount>("DueAccount", dueAccountSchema)
