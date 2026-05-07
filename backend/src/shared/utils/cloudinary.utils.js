import { Readable } from 'stream';
import cloudinary from '../../config/cloudinary.js';

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'nova',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

/**
 * Deletes a Cloudinary asset by its public_id.
 * @param {string} publicId
 * @param {'image'|'video'|'raw'} resourceType
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Extracts public_id from a Cloudinary URL for deletion.
 * @param {string} url
 */
export function extractPublicId(url) {
  // URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/<folder/public_id>.ext
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  // Skip version segment (vXXX)
  const pathParts = parts.slice(uploadIndex + 2);
  const publicIdWithExt = pathParts.join('/');
  return publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension
}
