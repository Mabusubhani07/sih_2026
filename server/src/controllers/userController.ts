import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ROLES } from '../config/constants';
import { AuditService } from '../services/auditService';

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { departmentId, role, search } = req.query;
      const where: any = {};

      if (departmentId) where.departmentId = String(departmentId);
      if (role) where.role = String(role);

      if (search) {
        const q = String(search).trim();
        where.OR = [
          { name: { contains: q } },
          { email: { contains: q } },
          { badgeNumber: { contains: q } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          badgeNumber: true,
          role: true,
          status: true,
          phone: true,
          lastLogin: true,
          createdAt: true,
          department: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.json(users);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve official directory.' });
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const admin = req.user!;

      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid user status value.' });
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        return res.status(404).json({ error: 'User record not found.' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { status },
        select: { id: true, name: true, email: true, badgeNumber: true, role: true, status: true },
      });

      await AuditService.log({
        userId: admin.id,
        userRole: admin.role,
        action: 'PERMISSION_CHANGED',
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { targetUserId: id, targetName: updated.name, newStatus: status },
      });

      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to modify clearance status.' });
    }
  }

  static async getDepartments(_req: Request, res: Response) {
    try {
      const departments = await prisma.department.findMany({
        include: {
          _count: {
            select: { users: true, cases: true, documents: true },
          },
        },
        orderBy: { code: 'asc' },
      });

      return res.json(departments);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve departments list.' });
    }
  }

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const user = req.user!;

      // Scope metrics based on role
      const [totalCases, totalDocuments, totalEvidence, recentAuditLogs, pendingActions] = await Promise.all([
        prisma.case.count({
          where:
            user.role === ROLES.ADMIN
              ? {}
              : {
                  OR: [
                    { createdById: user.id },
                    { leadInvestigatorId: user.id },
                    { memberships: { some: { userId: user.id } } },
                    { assignedDepartmentId: user.departmentId },
                  ],
                },
        }),
        prisma.document.count({
          where:
            user.role === ROLES.ADMIN
              ? {}
              : {
                  OR: [
                    { createdById: user.id },
                    { departmentId: user.departmentId },
                    { case: { memberships: { some: { userId: user.id } } } },
                  ],
                },
        }),
        prisma.evidence.count({
          where:
            user.role === ROLES.ADMIN
              ? {}
              : {
                  case: {
                    OR: [
                      { createdById: user.id },
                      { leadInvestigatorId: user.id },
                      { memberships: { some: { userId: user.id } } },
                    ],
                  },
                },
        }),
        prisma.auditLog.findMany({
          take: 8,
          orderBy: { timestamp: 'desc' },
          include: {
            user: { select: { name: true, role: true, badgeNumber: true } },
            case: { select: { caseNumber: true, title: true } },
          },
        }),
        prisma.documentShare.count({
          where: {
            sharedWithUserId: user.id,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        }),
      ]);

      return res.json({
        totalCases,
        totalDocuments,
        totalEvidence,
        pendingShares: pendingActions,
        recentActivity: recentAuditLogs,
      });
    } catch (err) {
      console.error('getDashboardStats error:', err);
      return res.status(500).json({ error: 'Failed to load dashboard metrics.' });
    }
  }
}
