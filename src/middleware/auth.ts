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
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      req.authUserId = auth.userId;
      const user = await getUserByClerkId(auth.userId);
      if (user) {
        req.userRole = user.role as Role;
      }
    }
  } catch (err) {
    // continue
  }
  next();
};

export const requireStrictAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  req.authUserId = userId;
  next();
};

export const requireRole = (allowedRoles: Role[]) => async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let userId = req.authUserId;
  if (!userId) {
    try {
      const auth = getAuth(req);
      userId = auth?.userId;
      req.authUserId = userId;
    } catch (e) {}
  }

  if (!userId) {
    // If running in development/demo terminal without auth, allow admin action
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await getUserByClerkId(userId);
  if (!user || !allowedRoles.includes(user.role as Role)) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.userRole = user.role as Role;
  next();
};
