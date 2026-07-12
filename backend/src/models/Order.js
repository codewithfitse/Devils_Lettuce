import mongoose from 'mongoose';

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  AVAILABLE_FOR_DELIVERY: 'available_for_delivery',
  DELIVERING: 'delivering',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quality: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['kg', 'piece'], required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    totalPrice: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    madeAvailableBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    madeAvailableAt: { type: Date },
    claimedAt: { type: Date },
    location: {
      address: { type: String, required: true },
      zone: { type: String },
      areaName: { type: String },
      km: { type: Number },
      deliveryPrice: { type: Number },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    phone: { type: String, required: true },
    notes: { type: String },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ merchantId: 1, status: 1 });
orderSchema.index({ assignedDriverId: 1, status: 1 });
orderSchema.index({ status: 1, assignedDriverId: 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
