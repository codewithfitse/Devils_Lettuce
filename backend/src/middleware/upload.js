import multer from 'multer';
import { AppError } from './errorHandler.js';

const memoryStorage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new AppError('Only image files allowed for payment proof', 400));
  }
  cb(null, true);
};

const pdfFilter = (_req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    return cb(new AppError('Official receipt must be a PDF file', 400));
  }
  cb(null, true);
};

export const uploadImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const uploadPaymentProof = multer({
  storage: memoryStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'proof') return imageFilter(req, file, cb);
    if (file.fieldname === 'receiptPdf') return pdfFilter(req, file, cb);
    return cb(new AppError(`Unexpected upload field: ${file.fieldname}`, 400));
  },
}).fields([
  { name: 'proof', maxCount: 1 },
  { name: 'receiptPdf', maxCount: 1 },
]);
