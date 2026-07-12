import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    quality: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, enum: ['kg', 'piece'], required: true },
  },
  { _id: true }
);

const deliveryOptionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String },
    isApproved: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    variants: { type: [variantSchema], default: [] },
    isActive: { type: Boolean, default: true },
    /** Zone keys from deliveryPricing.ZONES — merchant picks where this product can be delivered */
    deliveryZones: { type: [String], default: [] },
    /**
     * Product-level delivery options (hybrid rollout).
     * Product-level delivery areas. Price is computed from Area.km at checkout.
     */
    deliveryOptions: { type: [deliveryOptionSchema], default: [] },
  },
  { timestamps: true }
);

productSchema.index({ ownerId: 1 });
productSchema.index({ isApproved: 1, isActive: 1 });
productSchema.index({ isFeatured: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
