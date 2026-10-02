package com.camborio.reservas.privada;

import android.util.Log;

import com.google.firebase.messaging.RemoteMessage;
import com.capacitorjs.plugins.pushnotifications.MessagingService;

public class BadgeMessagingService extends MessagingService {

    private static final String TAG = "BadgeMessagingService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "Message data payload: " + remoteMessage.getData());

        // Badge messages are handled here and are deliberately NOT passed to
        // Capacitor's standard notification handler. The badge represents the
        // current number of pending reservations, not unread notifications.
        if (remoteMessage.getData().containsKey("pending_count")) {
            try {
                int pendingCount = Integer.parseInt(remoteMessage.getData().get("pending_count"));
                BadgeNotificationHelper.updateBadge(this, pendingCount);
                return;
            } catch (NumberFormatException e) {
                Log.e(TAG, "Error parsing pending_count", e);
            }
        }

        // Preserve normal Capacitor push handling for unrelated messages.
        super.onMessageReceived(remoteMessage);
    }
}
