import multer from 'multer';
import { AppError } from '../errors/index.js';

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'application/x-zip-compressed'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOC_TYPES];

// File size limits
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;  // 5MB
const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

/**
 * Creates a multer instance with memory storage and type/size validation.
 * Files are uploaded to Cloudinary in the service layer, not here.
 */
function createUploader(allowedTypes, sizeLimit) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: sizeLimit },
    fileFilter: (_req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new AppError(
            `Invalid file type "${file.mimetype}". Allowed: ${allowedTypes.join(', ')}`,
            400,
            'INVALID_FILE_TYPE'
          )
        );
      }
    },
  });
}

export const uploadImage = createUploader(ALLOWED_IMAGE_TYPES, IMAGE_SIZE_LIMIT);
export const uploadVideo = createUploader(ALLOWED_VIDEO_TYPES, VIDEO_SIZE_LIMIT);
export const uploadMedia = createUploader(ALLOWED_MEDIA_TYPES, VIDEO_SIZE_LIMIT);

/**
 * Middleware to handle multer errors gracefully.
 */
export function handleUploadError(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds the allowed limit', 400, 'FILE_TOO_LARGE'));
    }
    return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
  }
  next(err);
}
