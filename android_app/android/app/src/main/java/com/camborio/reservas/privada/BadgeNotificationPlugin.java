package com.camborio.reservas.privada;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "BadgeNotification")
public class BadgeNotificationPlugin extends Plugin {
    private static final String CHANNEL_ID = "camborio_reservas_pending";
    private static final String CHANNEL_NAME = "Reservas pendientes";
    private static final int NOTIFICATION_ID = 1001;

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Contador de reservas pendientes");
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }

    @PluginMethod
    public void updateBadgeCount(PluginCall call) {
        Context context = getContext();
        int count = Math.max(0, call.getInt("count", 0));

        ensureChannel(context);

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            call.resolve();
            return;
        }

        if (count == 0) {
            manager.cancel(NOTIFICATION_ID);
            call.resolve();
            return;
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String text = count == 1
                ? "Tienes 1 reserva pendiente"
                : "Tienes " + count + " reservas pendientes";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("Camborio Reservas")
                .setContentText(text)
                .setNumber(count)
                .setBadgeIconType(NotificationCompat.BADGE_ICON_NONE)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setAutoCancel(false)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE);

        manager.notify(NOTIFICATION_ID, builder.build());
        call.resolve();
    }
}
