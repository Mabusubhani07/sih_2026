import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ROLES, DOCUMENT_TYPES } from '../config/constants';

export class SearchController {
  static async search(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { q, documentType, caseId, departmentId, startDate, endDate } = req.query;

      const queryStr = String(q || '').trim();
      if (!queryStr && !documentType && !caseId) {
        return res.json({ documents: [], cases: [], total: 0 });
      }

      // 1. Build strict authorization criteria for Document search
      const docWhere: any = {
        status: { not: 'DELETED' },
      };

      if (documentType) {
        docWhere.documentType = String(documentType);
      }

      if (caseId) {
        docWhere.caseId = String(caseId);
      }

      if (startDate || endDate) {
        docWhere.createdAt = {};
        if (startDate) docWhere.createdAt.gte = new Date(String(startDate));
        if (endDate) docWhere.createdAt.lte = new Date(String(endDate));
      }

      // Security check: Role & Case clearance
      if (user.role !== ROLES.ADMIN) {
        docWhere.OR = [
          { createdById: user.id },
          {
            case: {
              OR: [
                { createdById: user.id },
                { leadInvestigatorId: user.id },
                { memberships: { some: { userId: user.id } } },
                { assignedDepartmentId: user.departmentId },
              ],
            },
          },
          {
            shares: {
              some: {
                sharedWithUserId: user.id,
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        ];
      }

      // Natural language / keyword matching conditions
      if (queryStr) {
        const keywords = queryStr.toLowerCase().split(/\s+/).filter((k) => k.length > 2);

        // Detect if user query implies a document type
        const typeBoosts: string[] = [];
        const lowerQ = queryStr.toLowerCase();
        Object.values(DOCUMENT_TYPES).forEach((dt) => {
          const readable = dt.toLowerCase().replace(/_/g, ' ');
          if (lowerQ.includes(readable) || lowerQ.includes(dt.toLowerCase())) {
            typeBoosts.push(dt);
          }
        });
        if (lowerQ.includes('police')) typeBoosts.push(DOCUMENT_TYPES.POLICE_REPORT);
        if (lowerQ.includes('forensic')) typeBoosts.push(DOCUMENT_TYPES.FORENSIC_REPORT);
        if (lowerQ.includes('fir')) typeBoosts.push(DOCUMENT_TYPES.FIR);
        if (lowerQ.includes('witness') || lowerQ.includes('statement')) {
          typeBoosts.push(DOCUMENT_TYPES.WITNESS_STATEMENT);
        }
        if (lowerQ.includes('legal')) typeBoosts.push(DOCUMENT_TYPES.LEGAL_DOCUMENT);
        if (lowerQ.includes('evidence')) typeBoosts.push(DOCUMENT_TYPES.EVIDENCE);
        if (lowerQ.includes('court')) typeBoosts.push(DOCUMENT_TYPES.COURT_DOCUMENT);
        if (lowerQ.includes('investigation')) typeBoosts.push(DOCUMENT_TYPES.INVESTIGATION_REPORT);

        const searchConditions: any[] = [
          { title: { contains: queryStr, mode: 'insensitive' } },
          { documentNumber: { contains: queryStr, mode: 'insensitive' } },
          { subCategory: { contains: queryStr, mode: 'insensitive' } },
          { ocrText: { contains: queryStr, mode: 'insensitive' } },
          { classificationReason: { contains: queryStr, mode: 'insensitive' } },
          { case: { title: { contains: queryStr, mode: 'insensitive' } } },
          { case: { caseNumber: { contains: queryStr, mode: 'insensitive' } } },
          { case: { firNumber: { contains: queryStr, mode: 'insensitive' } } },
          {
            metadata: {
              is: {
                OR: [
                  { keywords: { contains: queryStr, mode: 'insensitive' } },
                  { entities: { contains: queryStr, mode: 'insensitive' } },
                  { referenceNumber: { contains: queryStr, mode: 'insensitive' } },
                  { issuingAuthority: { contains: queryStr, mode: 'insensitive' } },
                  { location: { contains: queryStr, mode: 'insensitive' } },
                  { departmentName: { contains: queryStr, mode: 'insensitive' } },
                  { language: { contains: queryStr, mode: 'insensitive' } },
                  { caseNumber: { contains: queryStr, mode: 'insensitive' } },
                  { firNumber: { contains: queryStr, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            evidence: {
              some: {
                OR: [
                  { title: { contains: queryStr, mode: 'insensitive' } },
                  { description: { contains: queryStr, mode: 'insensitive' } },
                  { category: { contains: queryStr, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            versions: {
              some: {
                OR: [
                  { originalFileName: { contains: queryStr, mode: 'insensitive' } },
                  { changeSummary: { contains: queryStr, mode: 'insensitive' } },
                  { extractedText: { contains: queryStr, mode: 'insensitive' } },
                  { sha256Hash: { contains: queryStr, mode: 'insensitive' } },
                ],
              },
            },
          },
        ];

        if (typeBoosts.length > 0) {
          searchConditions.push({ documentType: { in: typeBoosts } } as any);
        }

        docWhere.AND = [
          ...(docWhere.AND || []),
          { OR: searchConditions },
        ];
      }

      // Query database for pre-authorized documents
      const documents = await prisma.document.findMany({
        where: docWhere,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              firNumber: true,
              title: true,
              status: true,
            },
          },
          department: true,
          metadata: true,
          createdBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      });

      // Also search authorized cases if query string is present
      const caseWhere: any = {};
      if (queryStr) {
        caseWhere.OR = [
          { caseNumber: { contains: queryStr } },
          { firNumber: { contains: queryStr } },
          { title: { contains: queryStr } },
          { description: { contains: queryStr } },
          { crimeCategory: { contains: queryStr } },
        ];
      }

      if (user.role !== ROLES.ADMIN) {
        caseWhere.AND = [
          {
            OR: [
              { createdById: user.id },
              { leadInvestigatorId: user.id },
              { memberships: { some: { userId: user.id } } },
              { assignedDepartmentId: user.departmentId },
            ],
          },
        ];
      }

      const cases = queryStr
        ? await prisma.case.findMany({
            where: caseWhere,
            include: {
              assignedDepartment: true,
              leadInvestigator: { select: { name: true, badgeNumber: true } },
            },
            take: 10,
          })
        : [];

      return res.json({
        query: queryStr,
        documents,
        cases,
        totalDocuments: documents.length,
        totalCases: cases.length,
      });
    } catch (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Search processing error.' });
    }
  }
}
