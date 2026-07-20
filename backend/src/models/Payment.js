import mongoose from 'mongoose';

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const VERIFICATION_RECOMMENDATION = {
  LIKELY_REAL: 'likely_real',
  UNCERTAIN: 'uncertain',
  LIKELY_FAKE: 'likely_fake',
};

const verificationCheckSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    passed: { type: Boolean, required: true },
    points: { type: Number, required: true },
    maxPoints: { type: Number, required: true },
    detail: { type: String },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    confidence: { type: Number, min: 0, max: 100 },
    recommendation: {
      type: String,
      enum: Object.values(VERIFICATION_RECOMMENDATION),
    },
    extracted: {
      amount: { type: Number },
      recipient: { type: String },
      reference: { type: String },
      successText: { type: String },
      rawText: { type: String },
    },
    checks: [verificationCheckSchema],
    processedAt: { type: Date },
    error: { type: String },
    duplicateViolation: { type: Boolean, default: false },
    officialReceipt: {
      transactionId: { type: String },
      receiptUrl: { type: String },
      creditedPartyName: { type: String },
      creditedPartyAccount: { type: String },
      transactionStatus: { type: String },
      settledAmount: { type: Number },
      invoiceNo: { type: String },
      fetchedAt: { type: Date },
      fetchError: { type: String },
      httpStatus: { type: Number },
      source: { type: String, enum: ['veritas', 'html', 'pdf'] },
    },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    totalAmount: { type: Number, required: true, min: 0 },
    proof: { type: String },
    officialReceiptPdf: { type: String },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    expiresAt: { type: Date, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    autoApproved: { type: Boolean, default: false },
    rejectionReason: { type: String },
    telebirrReference: { type: String },
    telebirrSmsText: { type: String },
    transactionKey: { type: String, trim: true },
    proofHash: { type: String },
    duplicateViolation: { type: Boolean, default: false },
    violationReason: { type: String },
    duplicateOfPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    duplicateType: { type: String, enum: ['transaction_reference', 'proof_image'] },
    verification: { type: verificationSchema, default: () => ({ status: VERIFICATION_STATUS.PENDING }) },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ status: 1, expiresAt: 1 });
paymentSchema.index({ transactionKey: 1, status: 1 });
paymentSchema.index({ proofHash: 1, status: 1 });

paymentSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
