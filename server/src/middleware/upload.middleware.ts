import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp', '.heic', '.heif'];
  const ext = path.extname(file.originalname).toLowerCase();
  // also allow by mimetype for files with missing/wrong extension
  const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
  if (allowed.includes(ext) || allowedMime.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed: ${ext}`));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }, // 10MB
});

// Helper: build public URL for uploaded file
export const fileUrl = (req: Request, filename: string): string =>
  `${req.protocol}://${req.get('host')}/${UPLOAD_DIR}/${filename}`;
