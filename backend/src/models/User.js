import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SUB_ADMIN: 'sub_admin',
  MERCHANT: 'merchant',
  DRIVER: 'driver',
  USER: 'user',
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    telegramId: { type: String, unique: true, sparse: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    permissions: {
      canSell: { type: Boolean, default: false },
      canDeliver: { type: Boolean, default: false },
    },
    language: { type: String, enum: ['en', 'am'], default: 'en' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isSuperAdmin = function () {
  return this.role === ROLES.SUPER_ADMIN;
};

userSchema.methods.isSubAdmin = function () {
  return this.role === ROLES.SUB_ADMIN;
};

userSchema.methods.canManageProducts = function () {
  return (
    this.isSuperAdmin() ||
    this.isSubAdmin() ||
    this.role === ROLES.MERCHANT ||
    this.permissions.canSell
  );
};

userSchema.methods.canDeliverOrders = function () {
  return (
    this.isSuperAdmin() ||
    this.isSubAdmin() ||
    this.role === ROLES.DRIVER ||
    this.permissions.canDeliver
  );
};

const User = mongoose.model('User', userSchema);
export default User;
