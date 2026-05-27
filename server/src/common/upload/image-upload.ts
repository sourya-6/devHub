import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const multerImageOptions = {
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    },
  }),
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.test(extension) && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    cb(null, false);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};