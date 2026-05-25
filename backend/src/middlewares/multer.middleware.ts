import multer, { type StorageEngine } from "multer";
import type { Request } from "express";
import path from "node:path";
import fs from "fs";


if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage: StorageEngine = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb
  ) {
    cb(null, "uploads/");
  },
  filename: function (
    req: Request,
    file: Express.Multer.File,
    cb
  ) {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.originalname);

    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.test(ext) && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

export default upload;