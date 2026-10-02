package com.camborio.reservas.privada;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public final class BadgeNotificationHelper {
    private static final String TAG = "BadgeNotificationHelper";
    private static final String CHANNEL_ID = "badge_updates_channel";
    private static final int BADGE_NOTIFICATION_ID = 1001;
    private static final String PREFS = "reservation_badge";
    private static final String KEY_COUNT = "pending_count";

    private BadgeNotificationHelper() {}

    public static void updateBadge(Context context, int count) {
        int safeCount = Math.max(0, count);
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        if (safeCount == 0) {
            prefs.edit().remove(KEY_COUNT).apply();
            NotificationManagerCompat.from(context).cancel(BADGE_NOTIFICATION_ID);
            return;
        }

        prefs.edit().putInt(KEY_COUNT, safeCount).apply();
        showBadgeNotification(context, safeCount);
    }

    public static void restoreBadge(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int count = prefs.getInt(KEY_COUNT, 0);
        if (count > 0) {
            showBadgeNotification(context, count);
        }
    }

    private static void showBadgeNotification(Context context, int count) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Reservas Pendientes",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Contador persistente de reservas pendientes de confirmar");
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
                .setOngoing(true)
                .setOnlyAlertOnce(true);

        try {
            NotificationManagerCompat.from(context).notify(BADGE_NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Persistent badge restored/updated to " + count);
        } catch (SecurityException e) {
            Log.e(TAG, "Permission denied for POST_NOTIFICATIONS", e);
        }
    }
}
