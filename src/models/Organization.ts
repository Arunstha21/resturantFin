import mongoose, { Schema, Document, models } from "mongoose";

export interface IOrg extends Document {
  name: string;
  shortName?: string;
  users: mongoose.Types.ObjectId[];
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrg>({
  name: { type: String, required: true },
  shortName: String,
  users: [{ type: Schema.Types.ObjectId, ref: "User" }],
  address: String,
  phone: String,
  email: String,
  taxId: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default models.Organization || mongoose.model<IOrg>("Organization", OrganizationSchema);
