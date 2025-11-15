import mongoose, { Schema, Document, models } from "mongoose";

export interface IMenuItem extends Document {
  name: string
  description?: string
  price: number
  category: string
  isAvailable: boolean
  image?: string
  createdBy: object
  organization: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

export default models.MenuItem || mongoose.model<IMenuItem>("MenuItem", MenuItemSchema)
