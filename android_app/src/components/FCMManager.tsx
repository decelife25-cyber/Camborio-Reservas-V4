import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function FCMManager() {
  const { session } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!session?.access_token || !session?.user?.id) return;

    let isRegistered = false;

    const syncBadge = async (reason: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('sync-badge');
        if (error) {
          console.error(`Error syncing badge (${reason}):`, error);
        } else {
          console.log(`Badge synced (${reason}):`, data);
        }
      } catch (err) {
        console.error(`Exception syncing badge (${reason}):`, err);
      }
    };

    // Register listeners FIRST before requesting permission/registration.
    // This avoids the race condition where the token is received before the listener is active.
    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      console.log('FCM token received');
      const { error } = await supabase.from('fcm_tokens').upsert({
        user_id: session.user.id,
        token: token.value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'token' });

      if (error) {
        console.error('Error saving FCM token:', error);
        return;
      }

      // A new/renewed token must immediately receive the current count.
      await syncBadge('FCM registration');
    });

    const registrationErrorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on push registration:', error);
    });

    async function registerPush() {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permissions');
          return;
        }

        if (!isRegistered) {
          isRegistered = true;
          await PushNotifications.register();
        }
      } catch (err) {
        console.error('Error registering push notifications:', err);
      }
    }

    registerPush();

    // Reconcile the persisted badge with Supabase every time the authenticated
    // app starts. Opening the app is NOT equivalent to confirming a reservation.
    syncBadge('app startup');

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
    };
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appStateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && session?.access_token) {
        try {
          const { data, error } = await supabase.functions.invoke('sync-badge');
          if (error) {
            console.error('Error syncing badge from Edge Function', error);
          } else {
            console.log('Badge synced on foreground:', data);
          }
        } catch (err) {
          console.error('Exception syncing badge on app foreground:', err);
        }
      }
    });

    return () => {
      appStateListener.then(l => l.remove());
    };
  }, [session?.access_token]);

  return null;
}
