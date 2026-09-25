import { registerPlugin } from '@capacitor/core';

interface BadgeNotificationPlugin {
  updateBadgeCount(options: { count: number }): Promise<void>;
}

export const BadgeNotification = registerPlugin<BadgeNotificationPlugin>('BadgeNotification');
