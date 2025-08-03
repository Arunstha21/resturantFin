import mongoose, { type Document, Schema } from "mongoose"

export interface IUser extends Document {
  email: string
  password: string
  name: string
  role: "admin" | "manager" | "staff"
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
  role: {
    type: String,
    enum: ["admin", "manager", "staff"],
    default: "staff",
  }
  },{
    timestamps: true,
  })

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
