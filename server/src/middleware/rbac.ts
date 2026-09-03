import { Request, Response, NextFunction } from 'express';
import { ROLES, UserRole } from '../config/constants';
import { prisma } from '../prisma';
import { AuditService } from '../services/auditService';

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      AuditService.log({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'ACCESS_DENIED',
        status: 'DENIED',
        details: {
          reason: 'Role authorization failure',
          attemptedEndpoint: req.originalUrl,
          requiredRoles: allowedRoles,
        },
      });

      return res.status(403).json({
        error: 'ACCESS RESTRICTED: You do not possess the required departmental clearance for this action.',
        code: 'AUTH_403_ROLE',
      });
    }

    next();
  };
};

export const requireCaseAccess = (mode: 'READ' | 'WRITE' = 'READ') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      const caseId = req.params.caseId || req.params.id;
      if (!caseId) {
        return next();
      }

      // Admin has system-wide access
      if (req.user.role === ROLES.ADMIN) {
        return next();
      }

      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          memberships: true,
          assignedDepartment: true,
        },
      });

      if (!caseRecord) {
        return res.status(404).json({ error: 'Specified case not found.', code: 'CASE_NOT_FOUND' });
      }

      // Check write restrictions: Court users have strict read-only access
      if (mode === 'WRITE' && req.user.role === ROLES.COURT_USER) {
        AuditService.log({
          userId: req.user.id,
          userRole: req.user.role,
          action: 'ACCESS_DENIED',
          caseId,
          status: 'DENIED',
          details: 'Court / Judicial user attempted unauthorized write modification.',
        });
        return res.status(403).json({
          error: 'ACCESS RESTRICTED: Court / Judicial personnel maintain read-only discovery clearance.',
          code: 'AUTH_403_COURT_READONLY',
        });
      }

      // Check if user is creator or lead investigator
      const isCreatorOrLead =
        caseRecord.createdById === req.user.id ||
        caseRecord.leadInvestigatorId === req.user.id;

      if (isCreatorOrLead) {
        return next();
      }

      // Check explicit membership
      const isMember = caseRecord.memberships.some((m) => m.userId === req.user!.id);
      if (isMember) {
        return next();
      }

      // Department-level automatic clearance logic
      const userDept = req.user.departmentCode;
      if (userDept === 'POLICE' && (req.user.role === ROLES.POLICE_OFFICER || req.user.role === ROLES.INVESTIGATOR)) {
        return next();
      }

      if (userDept === 'FORENSICS' && req.user.role === ROLES.FORENSIC_OFFICER) {
        // Forensic officers have case access for forensic stage or assigned cases
        return next();
      }

      if (userDept === 'LEGAL' && req.user.role === ROLES.LEGAL_OFFICER) {
        return next();
      }

      if (userDept === 'JUDICIARY' && req.user.role === ROLES.COURT_USER) {
        return next();
      }

      AuditService.log({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'ACCESS_DENIED',
        caseId,
        status: 'DENIED',
        details: 'Insufficient case-level permissions',
      });

      return res.status(403).json({
        error: 'ACCESS RESTRICTED: You are not authorized to access this investigation workspace.',
        code: 'AUTH_403_CASE',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to verify case authorization.' });
    }
  };
};

export const requireDocumentAccess = (mode: 'READ' | 'WRITE' = 'READ') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }

      const documentId = req.params.documentId || req.params.id;
      if (!documentId) {
        return next();
      }

      // Admin has system-wide access
      if (req.user.role === ROLES.ADMIN) {
        return next();
      }

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          case: {
            include: {
              memberships: true,
            },
          },
          shares: {
            where: {
              sharedWithUserId: req.user.id,
              revokedAt: null,
            },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document record not found.', code: 'DOC_NOT_FOUND' });
      }

      // Write restriction for Court users
      if (mode === 'WRITE' && req.user.role === ROLES.COURT_USER) {
        return res.status(403).json({
          error: 'ACCESS RESTRICTED: Judicial users do not possess document mutation permissions.',
          code: 'AUTH_403_READONLY',
        });
      }

      // Check active share for the user
      const validShare = document.shares.find((s) => {
        if (s.expiresAt && new Date(s.expiresAt) < new Date()) return false;
        return true;
      });

      if (validShare) {
        if (mode === 'WRITE') {
          return res.status(403).json({
            error: 'ACCESS RESTRICTED: Document sharing grants read/download clearance only. You cannot modify the master record.',
            code: 'AUTH_403_SHARED_READONLY',
          });
        }
        return next();
      }

      // Check case membership or creator
      const isCreator = document.createdById === req.user.id;
      const isCaseLead = document.case.leadInvestigatorId === req.user.id;
      const isCaseMember = document.case.memberships.some((m) => m.userId === req.user!.id);

      if (isCreator || isCaseLead || isCaseMember) {
        return next();
      }

      // Departmental role clearance
      const userDept = req.user.departmentCode;
      if (userDept === 'POLICE' || userDept === 'INVESTIGATION') {
        return next();
      }

      if (userDept === 'FORENSICS' && req.user.role === ROLES.FORENSIC_OFFICER) {
        return next();
      }

      if (userDept === 'LEGAL' && req.user.role === ROLES.LEGAL_OFFICER) {
        return next();
      }

      if (userDept === 'JUDICIARY' && req.user.role === ROLES.COURT_USER) {
        if (mode === 'READ') return next();
      }

      AuditService.log({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'ACCESS_DENIED',
        documentId,
        status: 'DENIED',
        details: 'Insufficient document access clearance',
      });

      return res.status(403).json({
        error: 'ACCESS RESTRICTED: You do not have permission to access this official document.',
        code: 'AUTH_403_DOCUMENT',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to verify document authorization.' });
    }
  };
};
