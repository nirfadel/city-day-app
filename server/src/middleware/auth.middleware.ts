import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserDoc } from '../models';
import { ApiResponse } from '../types';

// ============================================================
// Response Helper - use everywhere for consistent API shape
// ============================================================
export const ok = <T>(res: Response, data: T, message?: string) =>
  res.json({ success: true, data, message } as ApiResponse<T>);

export const created = <T>(res: Response, data: T) =>
  res.status(201).json({ success: true, data } as ApiResponse<T>);

export const fail = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, error: message } as ApiResponse);

// ============================================================
// Extend Express Request
// ============================================================
declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
      isAdmin?: boolean;
    }
  }
}

// ============================================================
// JWT helpers
// ============================================================
const SECRET = process.env.JWT_SECRET || 'dev-secret';

export const signToken = (payload: object): string =>
  jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const verifyToken = (token: string): jwt.JwtPayload =>
  jwt.verify(token, SECRET) as jwt.JwtPayload;

// ============================================================
// Middleware: require any authenticated user (player or admin)
// ============================================================
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return fail(res, 'Unauthorized', 401);

    const token = header.split(' ')[1];
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId).populate('groupId');
    if (!user) return fail(res, 'User not found', 401);

    req.user = user;
    req.isAdmin = user.role === 'admin';
    next();
  } catch {
    return fail(res, 'Invalid token', 401);
  }
};

// ============================================================
// Middleware: require admin role
// ============================================================
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (!req.isAdmin) return fail(res, 'Forbidden - Admin only', 403);
    next();
  });
};
