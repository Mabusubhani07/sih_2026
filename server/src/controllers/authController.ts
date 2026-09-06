import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { AuditService } from '../services/auditService';
import { AUDIT_ACTIONS } from '../config/constants';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Official email and password credentials are required.' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { department: true },
      });

      if (!user) {
        AuditService.log({
          userRole: 'UNAUTHENTICATED',
          action: AUDIT_ACTIONS.LOGIN,
          status: 'FAILURE',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: { attemptedEmail: email, reason: 'User record not found' },
        });
        return res.status(401).json({ error: 'Invalid official credentials. Access denied.' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Official clearance suspended. Please contact system administration.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        AuditService.log({
          userId: user.id,
          userRole: user.role,
          action: AUDIT_ACTIONS.LOGIN,
          status: 'FAILURE',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: { attemptedEmail: email, reason: 'Invalid password' },
        });
        return res.status(401).json({ error: 'Invalid official credentials. Access denied.' });
      }

      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      const secret = process.env.JWT_SECRET || 'fallback_secret_key_gov_diemp';
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        },
        secret,
        { expiresIn: '12h' }
      );

      AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.LOGIN,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { department: user.department.code, badgeNumber: user.badgeNumber },
      });

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          badgeNumber: user.badgeNumber,
          role: user.role,
          departmentId: user.departmentId,
          departmentCode: user.department.code,
          departmentName: user.department.name,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err: any) {
      console.error('[Login Failure]', err);
      const isDev = process.env.NODE_ENV !== 'production' || process.env.VERCEL === '1';
      return res.status(500).json({
        error: isDev && err?.message ? `Authentication error: ${err.message}` : 'Internal security authentication failure.',
        details: isDev ? err?.stack : undefined,
      });
    }
  }

  static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { department: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        badgeNumber: user.badgeNumber,
        role: user.role,
        departmentId: user.departmentId,
        departmentCode: user.department.code,
        departmentName: user.department.name,
        avatarUrl: user.avatarUrl,
        status: user.status,
        lastLogin: user.lastLogin,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve official session.' });
    }
  }

  static async logout(req: Request, res: Response) {
    if (req.user) {
      AuditService.log({
        userId: req.user.id,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.LOGOUT,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    return res.json({ message: 'Session terminated successfully.' });
  }

  static async getDemoAccounts(_req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          email: true,
          name: true,
          role: true,
          badgeNumber: true,
          department: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: { role: 'asc' },
      });

      return res.json(users);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load demo accounts' });
    }
  }
}
