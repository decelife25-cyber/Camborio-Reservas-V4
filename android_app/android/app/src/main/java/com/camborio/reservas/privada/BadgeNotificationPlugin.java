package com.camborio.reservas.privada;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BadgeNotification", permissions = {\n        @com.getcapacitor.annotation.Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})\n})
public class BadgeNotificationPlugin extends Plugin {
    private static final String CHANNEL_ID = "camborio_reservas_pending";
    private static final int NOTIFICATION_ID = 1001;

    @PluginMethod
    public void update(PluginCall call) {
        int count = call.getInt("count", 0);
        updateBadge(getContext(), count);
        call.resolve();
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getActivity().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("notifications", call, "notifications");
                return;
            }
        }
        call.resolve();
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager =
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Reservas pendientes",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Contador de reservas pendientes de confirmar");
            channel.setShowBadge(true);
            manager.createNotificationChannel(channel);
        }
    }

    private static void updateBadge(Context context, int count) {
        createChannel(context);
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);

        if (count <= 0) {
            manager.cancel(NOTIFICATION_ID);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
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
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Camborio Reservas")
                .setContentText(text)
                .setNumber(count)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setAutoCancel(false)
                .setShowWhen(false)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        manager.notify(NOTIFICATION_ID, builder.build());
    }
}
