import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { ROLES } from '../config/constants';

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

        // Detect if user query implies a document type (e.g. "forensic", "fir", "statement")
        const typeBoosts: string[] = [];
        if (queryStr.toLowerCase().includes('forensic')) typeBoosts.push('FORENSIC_REPORT');
        if (queryStr.toLowerCase().includes('fir')) typeBoosts.push('FIR');
        if (queryStr.toLowerCase().includes('witness') || queryStr.toLowerCase().includes('statement')) {
          typeBoosts.push('WITNESS_STATEMENT');
        }
        if (queryStr.toLowerCase().includes('police')) typeBoosts.push('POLICE_REPORT');
        if (queryStr.toLowerCase().includes('legal')) typeBoosts.push('LEGAL_DOCUMENT');
        if (queryStr.toLowerCase().includes('evidence')) typeBoosts.push('EVIDENCE');

        const searchConditions: any[] = [
          { title: { contains: queryStr } },
          { documentNumber: { contains: queryStr } },
          { subCategory: { contains: queryStr } },
          { ocrText: { contains: queryStr } },
          { classificationReason: { contains: queryStr } },
          { case: { title: { contains: queryStr } } },
          { case: { caseNumber: { contains: queryStr } } },
          { case: { firNumber: { contains: queryStr } } },
          {
            metadata: {
              is: {
                OR: [
                  { keywords: { contains: queryStr } },
                  { entities: { contains: queryStr } },
                  { referenceNumber: { contains: queryStr } },
                  { issuingAuthority: { contains: queryStr } },
                  { location: { contains: queryStr } },
                ],
              },
            },
          },
          {
            evidence: {
              some: {
                OR: [
                  { title: { contains: queryStr } },
                  { description: { contains: queryStr } },
                  { category: { contains: queryStr } },
                ],
              },
            },
          },
          {
            versions: {
              some: {
                OR: [
                  { originalFileName: { contains: queryStr } },
                  { changeSummary: { contains: queryStr } },
                  { extractedText: { contains: queryStr } },
                  { sha256Hash: { contains: queryStr } },
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
