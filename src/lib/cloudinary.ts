import { v2 as cloudinary } from 'cloudinary';

export type StoredImage = { secureUrl: string; publicId: string };

function assertConfigured() {
  if (process.env.CLOUDINARY_URL) return;
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadMenuImage(buffer: Buffer, restaurantId: number): Promise<StoredImage> {
  assertConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `restaurant-pos/restaurants/${restaurantId}/menu`,
      resource_type: 'image',
      overwrite: false,
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
    }, (error, result) => {
      if (error || !result) reject(error || new Error('Cloudinary did not return an upload result'));
      else resolve({ secureUrl: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

export async function deleteMenuImage(publicId: string | null | undefined) {
  if (!publicId) return;
  assertConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
}
