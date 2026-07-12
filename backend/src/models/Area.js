import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true },
    km: { type: Number, required: true, min: 0 },
    zone: { type: String, required: true, trim: true },
    /** Added on top of formula price (e.g. +200 for far areas) */
    extraFee: { type: Number, default: 0, min: 0 },
    /** When set, replaces formula + extraFee entirely */
    priceOverride: { type: Number, min: 0, default: null },
  },
  { timestamps: true }
);

areaSchema.index({ name: 1 });
areaSchema.index({ zone: 1 });

const Area = mongoose.model('Area', areaSchema);
export default Area;
