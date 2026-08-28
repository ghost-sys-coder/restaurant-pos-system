import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { getUserByClerkId } from '../db/users.ts';
import { Role } from '../types.ts';

export interface AuthRequest extends Request {
  authUserId?: string;
  userRole?: Role;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.authUserId = userId;
  next();
};

export const requireRole = (allowedRoles: Role[]) => async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.authUserId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await getUserByClerkId(req.authUserId);
  if (!user || !allowedRoles.includes(user.role as Role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.userRole = user.role as Role;
  next();
};
