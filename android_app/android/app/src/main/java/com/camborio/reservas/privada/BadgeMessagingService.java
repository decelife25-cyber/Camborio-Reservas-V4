package com.camborio.reservas.privada;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
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
    private static final int BADGE_NOTIFICATION_ID = 1001;
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

    public static void restoreBadge(Context context) {
        int count = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getInt(PREF_PENDING_COUNT, 0);
        if (count > 0) {
            new Handler(Looper.getMainLooper()).postDelayed(
                    () -> updateBadgeForContext(context, count), 500
            );
        }
    }

    private void updateBadge(int count) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putInt(PREF_PENDING_COUNT, count).apply();
        updateBadgeForContext(this, count);
    }

    private static void updateBadgeForContext(Context context, int count) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        if (count == 0) {
            notificationManager.cancel(BADGE_NOTIFICATION_ID);
            return;
        }

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
            notificationManager.notify(BADGE_NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Badge notification updated to " + count);
        } catch (SecurityException e) {
            Log.e(TAG, "Permission denied for POST_NOTIFICATIONS", e);
        }
    }
}
