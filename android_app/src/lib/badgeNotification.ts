import { registerPlugin } from '@capacitor/core';

type BadgeNotificationPlugin = {
  update(options: { count: number }): Promise<void>;
  requestPermission(): Promise<void>;
};

export const BadgeNotification = registerPlugin<BadgeNotificationPlugin>('BadgeNotification');
