import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs/promises';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(filePath: string, folder = 'uploads') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
    });

    await fs.unlink(filePath).catch(() => undefined);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }
}

export async function deleteFromCloudinary(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}