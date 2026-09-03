import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  badgeNumber: string;
  role: string;
  departmentId: string;
  departmentCode: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateJwt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. No valid authorization token provided.',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret_key_gov_diemp';

    const decoded = jwt.verify(token, secret) as { userId: string };
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid or expired authentication token.',
        code: 'TOKEN_INVALID',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { department: true },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authenticated user record does not exist.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Account has been deactivated or suspended by system administration.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      badgeNumber: user.badgeNumber,
      role: user.role,
      departmentId: user.departmentId,
      departmentCode: user.department.code,
      status: user.status,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      error: 'Session expired or authentication failed. Please sign in again.',
      code: 'AUTH_FAILED',
    });
  }
};
