import { registerPlugin } from '@capacitor/core';

type AppBadgePlugin = {
  setCount(options: { count: number }): Promise<{ count: number }>;
};

const AppBadge = registerPlugin<AppBadgePlugin>('AppBadge');

export async function setAppBadge(count: number) {
  try {
    await AppBadge.setCount({ count: Math.max(0, count) });
  } catch (error) {
    console.warn('No se pudo actualizar el contador del icono', error);
  }
}
