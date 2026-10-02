package com.camborio.reservas.privada;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Opening the app must NOT mark pending reservations as read.
        // Restore the last known badge immediately; the app will reconcile it
        // with Supabase through FCMManager afterwards.
        BadgeNotificationHelper.restoreBadge(this);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Android 15+ enforces edge-to-edge for apps targeting SDK 35+.
        // Keep the scrolling WebView out of the bottom system navigation area
        // so the last reservation row is not visible through the navigation bar.
        View contentView = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, insets) -> {
            Insets navigationBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            Insets tappableElement = insets.getInsets(WindowInsetsCompat.Type.tappableElement());
            Insets systemGestures = insets.getInsets(WindowInsetsCompat.Type.systemGestures());

            int bottom = Math.max(
                navigationBars.bottom,
                Math.max(tappableElement.bottom, systemGestures.bottom)
            );

            view.setPadding(
                view.getPaddingLeft(),
                view.getPaddingTop(),
                view.getPaddingRight(),
                bottom
            );
            return insets;
        });
        ViewCompat.requestApplyInsets(contentView);
    }
}
