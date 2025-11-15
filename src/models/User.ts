import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  email: string
  password: string
  name: string
  organization: mongoose.Types.ObjectId
  role: "admin" | "manager" | "staff"
  superAdmin?: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "manager", "staff"],
    default: "staff",
  },
  superAdmin: {
    type: Boolean,
    default: false,
  },
},
{
  timestamps: true,
})

export default models.User || mongoose.model<IUser>("User", UserSchema)
