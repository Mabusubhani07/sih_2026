import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuditService } from '../services/auditService';
import { NotificationService } from '../services/notificationService';
import { AUDIT_ACTIONS, CASE_PRIORITY, CASE_STATUS, ROLES } from '../config/constants';

export class CaseController {
  static async getCases(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { status, priority, search, departmentId } = req.query;

      const where: any = {};

      if (status) where.status = String(status);
      if (priority) where.priority = String(priority);
      if (departmentId) where.assignedDepartmentId = String(departmentId);

      if (search) {
        const q = String(search).trim();
        where.OR = [
          { caseNumber: { contains: q } },
          { firNumber: { contains: q } },
          { title: { contains: q } },
          { description: { contains: q } },
          { crimeCategory: { contains: q } },
          { policeStation: { contains: q } },
        ];
      }

      // Departmental/Role-based clearance filtering
      if (user.role !== ROLES.ADMIN) {
        if (user.role === ROLES.POLICE_OFFICER) {
          // Can see cases in police jurisdiction, or cases they created
          where.OR = [
            ...(where.OR || []),
            { createdById: user.id },
            { assignedDepartment: { code: 'POLICE' } },
            { memberships: { some: { userId: user.id } } },
          ];
        } else if (user.role === ROLES.INVESTIGATOR) {
          where.OR = [
            ...(where.OR || []),
            { leadInvestigatorId: user.id },
            { memberships: { some: { userId: user.id } } },
            { assignedDepartment: { code: { in: ['INVESTIGATION', 'POLICE'] } } },
          ];
        } else if (user.role === ROLES.FORENSIC_OFFICER) {
          where.OR = [
            ...(where.OR || []),
            { status: CASE_STATUS.FORENSIC_ANALYSIS },
            { memberships: { some: { userId: user.id } } },
            { documents: { some: { documentType: 'FORENSIC_REPORT' } } },
            { evidenceItems: { some: { custodyLocation: { contains: 'Forensic' } } } },
          ];
        } else if (user.role === ROLES.LEGAL_OFFICER) {
          where.OR = [
            ...(where.OR || []),
            { status: { in: [CASE_STATUS.LEGAL_REVIEW, CASE_STATUS.COURT_SUBMITTED] } },
            { memberships: { some: { userId: user.id } } },
            { documents: { some: { shares: { some: { sharedWithUserId: user.id, revokedAt: null } } } } },
          ];
        } else if (user.role === ROLES.COURT_USER) {
          where.OR = [
            ...(where.OR || []),
            { status: CASE_STATUS.COURT_SUBMITTED },
            { memberships: { some: { userId: user.id } } },
          ];
        }
      }

      const cases = await prisma.case.findMany({
        where,
        include: {
          assignedDepartment: true,
          leadInvestigator: {
            select: { id: true, name: true, badgeNumber: true, role: true },
          },
          createdBy: {
            select: { id: true, name: true, badgeNumber: true, role: true },
          },
          _count: {
            select: {
              documents: true,
              evidenceItems: true,
              memberships: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return res.json(cases);
    } catch (err) {
      console.error('getCases error:', err);
      return res.status(500).json({ error: 'Failed to retrieve cases.' });
    }
  }

  static async createCase(req: Request, res: Response) {
    try {
      const user = req.user!;
      const {
        title,
        firNumber,
        crimeCategory,
        policeStation,
        jurisdiction,
        incidentDate,
        incidentLocation,
        description,
        priority = CASE_PRIORITY.MEDIUM,
        assignedDepartmentId,
        leadInvestigatorId,
      } = req.body;

      if (!title || !firNumber || !policeStation || !incidentLocation || !description) {
        return res.status(400).json({
          error: 'Required case registration fields missing (Title, FIR Number, Police Station, Location, Description).',
        });
      }

      // Check for existing FIR number
      const existingFir = await prisma.case.findUnique({
        where: { firNumber: firNumber.trim() },
      });
      if (existingFir) {
        return res.status(409).json({
          error: `An official case record is already registered under FIR number: ${firNumber}`,
        });
      }

      // Generate realistic Case ID (e.g. CASE-2026-00421)
      const year = new Date().getFullYear();
      const count = await prisma.case.count();
      const caseNumber = `CASE-${year}-${String(count + 101).padStart(5, '0')}`;

      // Default department to POLICE or INVESTIGATION if not provided
      let targetDeptId = assignedDepartmentId;
      if (!targetDeptId) {
        const dept = await prisma.department.findFirst({
          where: { code: 'POLICE' },
        });
        targetDeptId = dept?.id || user.departmentId;
      }

      const newCase = await prisma.case.create({
        data: {
          caseNumber,
          firNumber: firNumber.trim(),
          title: title.trim(),
          description: description.trim(),
          crimeCategory: crimeCategory || 'General Investigation',
          policeStation: policeStation.trim(),
          jurisdiction: jurisdiction || policeStation.trim(),
          incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
          incidentLocation: incidentLocation.trim(),
          priority,
          status: CASE_STATUS.UNDER_INVESTIGATION,
          assignedDepartmentId: targetDeptId,
          leadInvestigatorId: leadInvestigatorId || (user.role === ROLES.INVESTIGATOR ? user.id : null),
          createdById: user.id,
          memberships: {
            create: {
              userId: user.id,
              roleInCase: user.role === ROLES.INVESTIGATOR ? 'LEAD_INVESTIGATOR' : 'INITIAL_OFFICER',
            },
          },
        },
        include: {
          assignedDepartment: true,
          createdBy: { select: { id: true, name: true, badgeNumber: true } },
          leadInvestigator: { select: { id: true, name: true, badgeNumber: true } },
        },
      });

      // Audit Log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.CASE_CREATED,
        caseId: newCase.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          caseNumber: newCase.caseNumber,
          firNumber: newCase.firNumber,
          title: newCase.title,
          policeStation: newCase.policeStation,
        },
      });

      return res.status(201).json(newCase);
    } catch (err: any) {
      console.error('createCase error:', err);
      return res.status(500).json({ error: 'Failed to register official case.' });
    }
  }

  static async getCaseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const caseRecord = await prisma.case.findUnique({
        where: { id },
        include: {
          assignedDepartment: true,
          createdBy: {
            select: { id: true, name: true, badgeNumber: true, role: true, department: true },
          },
          leadInvestigator: {
            select: { id: true, name: true, badgeNumber: true, role: true, department: true },
          },
          memberships: {
            include: {
              user: {
                select: { id: true, name: true, email: true, badgeNumber: true, role: true, department: true },
              },
            },
          },
          documents: {
            where: { status: { not: 'DELETED' } },
            include: {
              createdBy: { select: { id: true, name: true, badgeNumber: true } },
              versions: {
                orderBy: { versionNumber: 'desc' },
                take: 1,
              },
              metadata: true,
              department: true,
              shares: {
                where: { revokedAt: null },
                include: {
                  sharedWithUser: { select: { id: true, name: true, role: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          evidenceItems: {
            include: {
              document: {
                select: { id: true, documentNumber: true, title: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!caseRecord) {
        return res.status(404).json({ error: 'Case record not found.' });
      }

      // Generate dynamic case milestone timeline based on real data
      const auditEvents = await prisma.auditLog.findMany({
        where: { caseId: id },
        include: { user: { select: { name: true, role: true, badgeNumber: true } } },
        orderBy: { timestamp: 'asc' },
        take: 30,
      });

      return res.json({
        ...caseRecord,
        timeline: auditEvents,
      });
    } catch (err) {
      console.error('getCaseById error:', err);
      return res.status(500).json({ error: 'Failed to retrieve case workspace.' });
    }
  }

  static async updateCase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { status, priority, description, leadInvestigatorId, assignedDepartmentId } = req.body;

      const updated = await prisma.case.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(priority && { priority }),
          ...(description && { description: description.trim() }),
          ...(leadInvestigatorId && { leadInvestigatorId }),
          ...(assignedDepartmentId && { assignedDepartmentId }),
        },
        include: {
          assignedDepartment: true,
          leadInvestigator: { select: { id: true, name: true, badgeNumber: true } },
        },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.CASE_UPDATED,
        caseId: id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { updatedFields: req.body },
      });

      await NotificationService.notifyCaseMembers(
        id,
        `Case Updated: ${updated.caseNumber}`,
        `Case status updated to ${updated.status} (Priority: ${updated.priority}).`,
        'CASE_UPDATE',
        user.id
      );

      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update case parameters.' });
    }
  }

  static async addMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId, roleInCase } = req.body;
      const user = req.user!;

      if (!userId || !roleInCase) {
        return res.status(400).json({ error: 'User and case assignment role are required.' });
      }

      const membership = await prisma.caseMembership.upsert({
        where: { caseId_userId: { caseId: id, userId } },
        create: {
          caseId: id,
          userId,
          roleInCase,
        },
        update: {
          roleInCase,
        },
        include: {
          user: { select: { id: true, name: true, badgeNumber: true, role: true } },
        },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.CASE_UPDATED,
        caseId: id,
        status: 'SUCCESS',
        details: { addedMember: membership.user.name, roleInCase },
      });

      await NotificationService.sendNotification({
        userId,
        title: 'Assigned to Case Workspace',
        message: `You have been assigned to case investigation as ${roleInCase}.`,
        type: 'CASE_UPDATE',
        link: `/cases/${id}`,
      });

      return res.status(201).json(membership);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to assign personnel to case.' });
    }
  }
}
