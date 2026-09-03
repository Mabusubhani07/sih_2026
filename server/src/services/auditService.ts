import { prisma } from '../prisma';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogParams {
  userId?: string | null;
  userRole: string;
  action: string;
  caseId?: string | null;
  documentId?: string | null;
  status?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | string;
}

export class AuditService {
  /**
   * Logs an immutable audit entry
   */
  static async log(params: AuditLogParams) {
    try {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const eventId = `AUD-${year}-${randomSuffix}`;

      const detailsString = typeof params.details === 'object'
        ? JSON.stringify(params.details)
        : params.details || null;

      const logEntry = await prisma.auditLog.create({
        data: {
          eventId,
          userId: params.userId || null,
          userRole: params.userRole,
          action: params.action,
          caseId: params.caseId || null,
          documentId: params.documentId || null,
          status: params.status || 'SUCCESS',
          ipAddress: params.ipAddress || '127.0.0.1',
          userAgent: params.userAgent || 'DIEMP-Internal-Client/1.0',
          details: detailsString,
        },
      });

      return logEntry;
    } catch (error) {
      console.error('[AuditService] Failed to record audit log:', error);
      // Non-blocking in catastrophic error to prevent entire system halt, but logged
      return null;
    }
  }

  /**
   * Retrieves audit logs with authorized filtering
   */
  static async getLogs(filters: {
    caseId?: string;
    documentId?: string;
    userId?: string;
    action?: string;
    userRole?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.caseId) where.caseId = filters.caseId;
    if (filters.documentId) where.documentId = filters.documentId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.userRole) where.userRole = filters.userRole;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { eventId: { contains: q } },
        { action: { contains: q } },
        { userRole: { contains: q } },
        { details: { contains: q } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              badgeNumber: true,
              role: true,
            },
          },
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          document: {
            select: {
              id: true,
              documentNumber: true,
              title: true,
              documentType: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
