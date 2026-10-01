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

    // Register listeners FIRST before requesting permission/registration
    // This avoids the race condition where the token is received before the listener is active
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

      // The device may be registering for the first time while pending
      // reservations already exist. Force an immediate sync so the launcher
      // badge is initialized without waiting for a later DB change or
      // app-state transition.
      try {
        const { data, error: syncError } = await supabase.functions.invoke('sync-badge');
        if (syncError) {
          console.error('Error syncing initial badge after FCM registration:', syncError);
        } else {
          console.log('Initial badge synced after FCM registration:', data);
        }
      } catch (err) {
        console.error('Exception syncing initial badge after FCM registration:', err);
      }
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

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
    };
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Invoke sync-badge when app state changes to active
    const appStateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && session?.access_token) {
        try {
          // Since we use the edge function with JWT auth for frontend
          const { data, error } = await supabase.functions.invoke('sync-badge');
          if (error) {
            console.error('Error syncing badge from Edge Function', error);
          } else {
            console.log('Badge synced:', data);
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
