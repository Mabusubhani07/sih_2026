import { Request, Response } from 'express';
import { AuditService } from '../services/auditService';
import { ROLES } from '../config/constants';
import { prisma } from '../prisma';

export class AuditController {
  static async getLogs(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { caseId, documentId, userId, action, search, startDate, endDate, limit, offset } = req.query;

      let effectiveCaseId = caseId ? String(caseId) : undefined;
      let effectiveUserId = userId ? String(userId) : undefined;

      // If not admin, restrict scope to cases the user belongs to or their own user activity
      if (user.role !== ROLES.ADMIN) {
        if (!effectiveCaseId) {
          // If no specific case requested, show user's own activity or cases they lead/participate in
          effectiveUserId = user.id;
        } else {
          // Verify user has access to this case
          const isMember = await prisma.case.findFirst({
            where: {
              id: effectiveCaseId,
              OR: [
                { createdById: user.id },
                { leadInvestigatorId: user.id },
                { memberships: { some: { userId: user.id } } },
                { assignedDepartmentId: user.departmentId },
              ],
            },
          });

          if (!isMember) {
            return res.status(403).json({
              error: 'ACCESS RESTRICTED: You are not authorized to inspect audit logs for this case.',
            });
          }
        }
      }

      const result = await AuditService.getLogs({
        caseId: effectiveCaseId,
        documentId: documentId ? String(documentId) : undefined,
        userId: effectiveUserId,
        action: action ? String(action) : undefined,
        search: search ? String(search) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        limit: limit ? parseInt(String(limit), 10) : 50,
        offset: offset ? parseInt(String(offset), 10) : 0,
      });

      return res.json(result);
    } catch (err) {
      console.error('getLogs error:', err);
      return res.status(500).json({ error: 'Failed to retrieve audit log repository.' });
    }
  }
}
