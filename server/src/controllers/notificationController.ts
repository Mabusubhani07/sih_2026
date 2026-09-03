import { Request, Response } from 'express';
import { prisma } from '../prisma';

export class NotificationController {
  static async getNotifications(req: Request, res: Response) {
    try {
      const user = req.user!;
      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
        prisma.notification.count({
          where: { userId: user.id, isRead: false },
        }),
      ]);

      return res.json({ notifications, unreadCount });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification || notification.userId !== user.id) {
        return res.status(404).json({ error: 'Notification not found.' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update notification.' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const user = req.user!;
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });

      return res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update notifications.' });
    }
  }
}
