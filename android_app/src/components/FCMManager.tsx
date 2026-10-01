import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function FCMManager() {
  const { session } = useAuth();

  useEffect(() => {
    async function registerPush() {
      if (!session?.access_token) return;
      if (!Capacitor.isNativePlatform()) return;

      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permissions');
          return;
        }

        await PushNotifications.register();
      } catch (err) {
        console.error('Error registering push notifications:', err);
      }
    }

    if (session?.access_token) {
      registerPush();
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      if (!session?.user?.id) return;

      const { error } = await supabase.from('fcm_tokens').upsert({
        user_id: session.user.id,
        token: token.value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'token' });

      if (error) {
        console.error('Error saving FCM token:', error);
      }
    });

    const registrationErrorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on push registration:', error);
    });

    // Invoke sync-badge when app state changes to active
    const appStateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && session?.access_token) {
        try {
          await supabase.functions.invoke('sync-badge');
        } catch (err) {
          console.error('Error syncing badge on app foreground:', err);
        }
      }
    });

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      appStateListener.then(l => l.remove());
    };
  }, [session?.access_token, session?.user?.id]);

  return null;
}
