import { prisma } from '../prisma';

export class NotificationService {
  static async sendNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: 'CASE_UPDATE' | 'SHARE' | 'VERSION' | 'INTEGRITY' | 'SYSTEM';
    link?: string;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          link: params.link || null,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to create notification:', err);
      return null;
    }
  }

  static async notifyCaseMembers(
    caseId: string,
    title: string,
    message: string,
    type: 'CASE_UPDATE' | 'SHARE' | 'VERSION' | 'INTEGRITY' | 'SYSTEM',
    excludeUserId?: string,
    link?: string
  ) {
    try {
      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: { memberships: true },
      });

      if (!caseRecord) return;

      const recipientUserIds = new Set<string>();
      if (caseRecord.createdById) recipientUserIds.add(caseRecord.createdById);
      if (caseRecord.leadInvestigatorId) recipientUserIds.add(caseRecord.leadInvestigatorId);
      caseRecord.memberships.forEach((m) => recipientUserIds.add(m.userId));

      if (excludeUserId) {
        recipientUserIds.delete(excludeUserId);
      }

      for (const userId of recipientUserIds) {
        await this.sendNotification({
          userId,
          title,
          message,
          type,
          link: link || `/cases/${caseId}`,
        });
      }
    } catch (err) {
      console.error('[NotificationService] Failed to notify case members:', err);
    }
  }
}
