import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

deliveryZoneSchema.index({ key: 1 }, { unique: true });

const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
export default DeliveryZone;

