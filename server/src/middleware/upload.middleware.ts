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
  const allowed = [
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp', '.heic', '.heif',
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMime = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm', 'video/x-m4v',
  ];
  if (allowed.includes(ext) || allowedMime.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type not allowed: ${ext}`));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 200 * 1024 * 1024 }, // 200MB
});

// Helper: build public URL for uploaded file
export const fileUrl = (req: Request, filename: string): string =>
  `${req.protocol}://${req.get('host')}/${UPLOAD_DIR}/${filename}`;
