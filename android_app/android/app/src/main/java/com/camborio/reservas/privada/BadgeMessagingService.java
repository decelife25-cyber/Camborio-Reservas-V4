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
    private static final String CHANNEL_ID = "badge_updates_channel_v2";
    private static final int BADGE_NOTIFICATION_ID = 1001;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // ALWAYS pass it to Capacitor's standard handler first
        super.onMessageReceived(remoteMessage);

        Log.d(TAG, "Message data payload: " + remoteMessage.getData());

        // Process our specific data-only badge payload
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
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);

        if (count == 0) {
            notificationManager.cancel(BADGE_NOTIFICATION_ID);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Reservas Pendientes",
                        NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Actualizaciones silenciosas del contador de reservas pendientes");
                channel.setShowBadge(true);
                nm.createNotificationChannel(channel);
            }
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher_round)
                .setContentTitle("Reservas por confirmar")
                .setContentText("Tienes " + count + " reserva" + (count == 1 ? "" : "s") + " pendiente" + (count == 1 ? "" : "s"))
                 .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setNumber(count)
                .setBadgeIconType(NotificationCompat.BADGE_ICON_NONE)
                .setAutoCancel(false)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSilent(true);

        try {
            notificationManager.notify(BADGE_NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Badge notification updated to " + count);
        } catch (SecurityException e) {
            Log.e(TAG, "Permission denied for POST_NOTIFICATIONS", e);
        }
    }
}
