import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(cloudName && apiKey && apiSecret && cloudName !== 'your_cloud_name');

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  console.log('☁️ Cloudinary SDK configured successfully.');
} else {
  console.warn('⚠️ Cloudinary credentials missing or placeholder. Running with local fallback storage.');
}

/**
 * Upload an image buffer to Cloudinary with automatic fallback
 * @param {Buffer} buffer - File buffer from Multer
 * @param {string} folder - Destination folder (e.g. 'bodhgaya_tourists/photos')
 * @param {string} filename - Base name for the file
 * @returns {Promise<{ url: string, publicId: string, storageType: 'cloudinary' | 'local' }>}
 */
export const uploadImageBuffer = async (buffer, folder = 'bodhgaya_tourists/photos', filename = 'photo') => {
  if (isConfigured) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: `${filename}_${Date.now()}`,
            resource_type: 'image',
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary stream upload error, attempting fallback:', error.message);
              return reject(error);
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              storageType: 'cloudinary'
            });
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      console.warn('⚠️ Cloudinary upload failed, falling back to local static storage:', err.message);
      // Fallback proceeds below
    }
  }

  // Graceful Local Fallback: write to server/public/uploads/tourists
  const uploadsDir = path.resolve(__dirname, '../public/uploads/tourists');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeExt = 'jpg';
  const localFileName = `${filename}_${Date.now()}.${safeExt}`;
  const localFilePath = path.join(uploadsDir, localFileName);
  fs.writeFileSync(localFilePath, buffer);

  const localUrl = `/uploads/tourists/${localFileName}`;
  return {
    url: localUrl,
    publicId: localFileName,
    storageType: 'local'
  };
};

export default cloudinary;
