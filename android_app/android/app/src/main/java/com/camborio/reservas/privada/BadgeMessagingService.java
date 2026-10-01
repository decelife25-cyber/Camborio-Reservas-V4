package com.camborio.reservas.privada;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class BadgeMessagingService extends FirebaseMessagingService {

    private static final String TAG = "BadgeMessagingService";
    private static final String CHANNEL_ID = "badge_updates_channel";
    private static final int BADGE_NOTIFICATION_ID = 1001;

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
        } else {
            // Forward to Capacitor plugin by starting its service with the intent it expects
            Intent intent = new Intent(this, com.capacitorjs.plugins.pushnotifications.MessagingService.class);
            intent.setAction("com.google.firebase.MESSAGING_EVENT");
            intent.putExtra("message", remoteMessage);
            try {
                startService(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error forwarding to Capacitor MessagingService", e);
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
                        NotificationManager.IMPORTANCE_LOW
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

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);

        // Capacitor expects onNewToken without the Context argument inside its service.
        // We will just invoke it directly.
        com.capacitorjs.plugins.pushnotifications.MessagingService capService = new com.capacitorjs.plugins.pushnotifications.MessagingService();
        try {
            capService.onNewToken(token);
        } catch (Exception e) {
            Log.e(TAG, "Error forwarding new token to Capacitor", e);
        }
    }
}
