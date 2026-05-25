import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import dotenv from "dotenv"

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadToCloudinary = async (
  filePath: string,
  folder: string = "uploads"
):  Promise<{ url: string; public_id: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
    });

    // 🔥 delete local file after upload
    await fs.unlink(filePath);

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    // cleanup even on error
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error("File cleanup failed:", err);
    }
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  await cloudinary.uploader.destroy(publicId);
};