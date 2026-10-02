package com.camborio.reservas.privada;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.RemoteMessage;
import com.capacitorjs.plugins.pushnotifications.MessagingService;

public class BadgeMessagingService extends MessagingService {

    private static final String TAG = "BadgeMessagingService";
    private static final String CHANNEL_ID = "badge_updates_channel_v3";
    private static final String LEGACY_CHANNEL_ID = "badge_updates_channel_v2";
    private static final String ORIGINAL_CHANNEL_ID = "badge_updates_channel";
    private static final int BADGE_NOTIFICATION_ID_BASE = 1001;
    private static final String PREF_NOTIFICATION_ID = "notification_id";
    private static final String PREFS_NAME = "badge_state";
    private static final String PREF_PENDING_COUNT = "pending_count";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Log.d(TAG, "Message data payload: " + remoteMessage.getData());

        if (remoteMessage.getData().containsKey("pending_count")) {
            try {
                int pendingCount = Integer.parseInt(remoteMessage.getData().get("pending_count"));
                updateBadge(pendingCount);
            } catch (NumberFormatException e) {
                Log.e(TAG, "Error parsing pending_count", e);
            }
        }
    }

    private void updateBadge(int count) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putInt(PREF_PENDING_COUNT, count).apply();
        updateBadgeForContext(this, count);
    }

    private static void updateBadgeForContext(Context context, int count) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        android.content.SharedPreferences prefs =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int previousId = prefs.getInt(PREF_NOTIFICATION_ID, BADGE_NOTIFICATION_ID_BASE);

        if (count == 0) {
            notificationManager.cancel(previousId);
            prefs.edit().putInt(PREF_NOTIFICATION_ID, BADGE_NOTIFICATION_ID_BASE).apply();
            return;
        }

        // Xiaomi HyperOS hides the badge when the app is opened. Its official
        // guidance says the badge is shown again either by updating messageCount
        // or by posting a new notification with a different ID. Use a new ID
        // for every real pending-count update so this also works on other Android
        // launchers without relying on Xiaomi-specific APIs.
        notificationManager.cancel(previousId);
        int notificationId = previousId == Integer.MAX_VALUE
                ? BADGE_NOTIFICATION_ID_BASE
                : previousId + 1;
        prefs.edit().putInt(PREF_NOTIFICATION_ID, notificationId).apply();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                // Use a fresh channel so Xiaomi does not inherit stale per-channel badge settings.
                nm.deleteNotificationChannel(LEGACY_CHANNEL_ID);
                nm.deleteNotificationChannel(ORIGINAL_CHANNEL_ID);

                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Reservas Pendientes",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Actualizaciones silenciosas del contador de reservas pendientes");
                channel.setShowBadge(true);
                nm.createNotificationChannel(channel);
            }
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher_round)
                .setContentTitle("Reservas por confirmar")
                .setContentText("Tienes " + count + " reserva" + (count == 1 ? "" : "s") + " pendiente" + (count == 1 ? "" : "s"))
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setNumber(count)
                .setAutoCancel(false)
                .setOngoing(false);

        try {
            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "Badge notification updated to " + count);
        } catch (SecurityException e) {
            Log.e(TAG, "Permission denied for POST_NOTIFICATIONS", e);
        }
    }
}
