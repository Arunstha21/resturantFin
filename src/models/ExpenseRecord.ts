import mongoose, { type Document, Schema } from "mongoose"

export interface IExpenseRecord extends Document {
  amount: number
  category: string
  vendor?: string
  description: string
  date: Date
  receiptNumber?: string
  notes?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ExpenseRecordSchema = new Schema<IExpenseRecord>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
    },
    vendor: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    receiptNumber: {
      type: String,
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

export default mongoose.models.ExpenseRecord || mongoose.model<IExpenseRecord>("ExpenseRecord", ExpenseRecordSchema)
