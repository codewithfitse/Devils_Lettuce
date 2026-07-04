import cloudinary from '../config/cloudinary.js';
import { AppError } from '../middleware/errorHandler.js';

export async function uploadImage(file, folder = 'devils_lettuce') {
  if (!cloudinary.config().cloud_name) {
    throw new AppError('Cloudinary is not configured', 500);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(new AppError('Image upload failed', 500));
        else resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

export async function uploadDocument(file, folder = 'devils_lettuce/receipts') {
  if (!cloudinary.config().cloud_name) {
    throw new AppError('Cloudinary is not configured', 500);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', format: 'pdf' },
      (error, result) => {
        if (error) reject(new AppError('Document upload failed', 500));
        else resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

export async function deleteImage(publicId) {
  if (!cloudinary.config().cloud_name) return;
  await cloudinary.uploader.destroy(publicId);
}
