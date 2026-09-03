import { prisma } from '../prisma';

export class HierarchyService {
  /**
   * Builds the real hierarchical tree:
   * Organization -> Department -> Case -> Document Type -> Subcategory -> Document -> Document Version
   */
  static async getFullHierarchy(userId: string, userRole: string, departmentId: string) {
    // 1. Fetch organization with departments
    const organizations = await prisma.organization.findMany({
      include: {
        departments: {
          include: {
            cases: {
              include: {
                documents: {
                  where: { status: { not: 'INVALID' } },
                  include: {
                    versions: {
                      orderBy: { versionNumber: 'desc' },
                      select: {
                        id: true,
                        versionNumber: true,
                        fileName: true,
                        originalFileName: true,
                        fileSize: true,
                        sha256Hash: true,
                        changeSummary: true,
                        createdAt: true,
                      },
                    },
                    metadata: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Structure each case's documents grouped by Document Type and Subcategory
    return organizations.map((org) => ({
      id: org.id,
      code: org.code,
      name: org.name,
      departments: org.departments.map((dept) => ({
        id: dept.id,
        code: dept.code,
        name: dept.name,
        cases: dept.cases.map((c) => {
          // Group documents by documentType then subCategory
          const docTypeGroups: Record<string, Record<string, any[]>> = {};

          for (const doc of c.documents) {
            const dType = doc.documentType || 'OTHER';
            const sub = doc.subCategory || 'General Records';

            if (!docTypeGroups[dType]) {
              docTypeGroups[dType] = {};
            }
            if (!docTypeGroups[dType][sub]) {
              docTypeGroups[dType][sub] = [];
            }

            docTypeGroups[dType][sub].push({
              id: doc.id,
              documentNumber: doc.documentNumber,
              title: doc.title,
              documentType: doc.documentType,
              subCategory: doc.subCategory,
              processingStatus: doc.processingStatus,
              status: doc.status,
              currentVersionNumber: doc.currentVersionNumber,
              versions: doc.versions,
              metadata: doc.metadata,
            });
          }

          return {
            id: c.id,
            caseNumber: c.caseNumber,
            firNumber: c.firNumber,
            title: c.title,
            status: c.status,
            priority: c.priority,
            documentTypeHierarchy: Object.entries(docTypeGroups).map(([type, subcategories]) => ({
              documentType: type,
              subcategories: Object.entries(subcategories).map(([subCatName, docs]) => ({
                subCategory: subCatName,
                documentCount: docs.length,
                documents: docs,
              })),
            })),
          };
        }),
      })),
    }));
  }
}
