package com.cuenuvo.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import android.util.Log;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "CuenuvoActionDebug";
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private static final String CHANNEL_ID = "cuenuvo_reminders"; // MUST match CustomFirebaseMessagingService!

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "========================================");
        Log.d(TAG, "onReceive triggered for action intent!");

        if (intent == null) {
            Log.e(TAG, "Intent is null!");
            return;
        }

        String reminderId = intent.getStringExtra("reminderId");
        String actionId = intent.getStringExtra("actionId");
        int notificationId = intent.getIntExtra("notificationId", reminderId != null ? Math.abs(reminderId.hashCode()) : 1001);

        Log.d(TAG, "Extracted -> reminderId: " + reminderId + " | actionId: " + actionId + " | notificationId: " + notificationId);

        if (reminderId == null || actionId == null) {
            Log.e(TAG, "ERROR: reminderId or actionId is null. Aborting.");
            return;
        }

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            Log.e(TAG, "ERROR: NotificationManager is null!");
            return;
        }

        // Ensure channel exists
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_HIGH);
            notificationManager.createNotificationChannel(channel);
        }

        // 1. SHOW PROGRESS STATE IN TRAY
        String progressMsg = getProgressMessage(actionId);
        Log.d(TAG, "Building progress notification with text: '" + progressMsg + "'");

        NotificationCompat.Builder progressBuilder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setContentTitle("Cuenuvo")
                .setContentText(progressMsg)
                .setProgress(0, 0, true)
                .setOngoing(true)
                .setAutoCancel(false);

        try {
            notificationManager.notify(notificationId, progressBuilder.build());
            Log.d(TAG, "Successfully called notificationManager.notify() for progress state.");
        } catch (Exception e) {
            Log.e(TAG, "CRITICAL EXCEPTION while notifying progress state:", e);
        }

        // 2. EXECUTE BACKGROUND NETWORK CALL
        executorService.execute(() -> {
            Log.d(TAG, "Background thread started for HTTP POST...");
            try {
                URL url = new URL("https://app.cuenuvo.com/api/notifications/action");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);

                JSONObject jsonParam = new JSONObject();
                jsonParam.put("reminderId", reminderId);
                jsonParam.put("actionId", actionId);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonParam.toString().getBytes("utf-8");
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "HTTP POST complete. Response Code: " + responseCode);

                if (responseCode >= 200 && responseCode < 300) {
                    Log.d(TAG, "Success! Building confirmation notification...");
                    
                    NotificationCompat.Builder successBuilder = new NotificationCompat.Builder(context, CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.checkbox_on_background)
                            .setContentTitle("Cuenuvo")
                            .setContentText(getSuccessMessage(actionId))
                            .setOngoing(false)
                            .setAutoCancel(true)
                            .setTimeoutAfter(1200);

                    notificationManager.notify(notificationId, successBuilder.build());
                    Log.d(TAG, "Success notification posted. Should auto-dismiss in 1.2s.");
                } else {
                    Log.e(TAG, "Server returned failure code: " + responseCode);
                    showError(context, notificationManager, notificationId);
                }

            } catch (Exception e) {
                Log.e(TAG, "Exception during background HTTP POST execution:", e);
                showError(context, notificationManager, notificationId);
            }
        });
    }

    private void showError(Context context, NotificationManager manager, int notificationId) {
        NotificationCompat.Builder errorBuilder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("Cuenuvo")
                .setContentText("Failed to update reminder. Tap to retry.")
                .setOngoing(false)
                .setAutoCancel(true);
        manager.notify(notificationId, errorBuilder.build());
    }

    private String getProgressMessage(String actionId) {
        switch (actionId) {
            case "MARK_COMPLETE":
            case "MARK_PAID":
            case "DONE": return "Marking as completed...";
            case "PLUS_1H": return "Snoozing for 1 hour...";
            case "PLUS_1D": return "Snoozing for 1 day...";
            case "TOMORROW_9AM": return "Setting for tomorrow 9 AM...";
            case "SKIP_TODAY": return "Skipping today's cycle...";
            default: return "Updating reminder...";
        }
    }

    private String getSuccessMessage(String actionId) {
        switch (actionId) {
            case "MARK_COMPLETE":
            case "MARK_PAID":
            case "DONE": return "Completed ✓";
            case "PLUS_1H": return "Snoozed for 1 hour ⏰";
            case "PLUS_1D": return "Snoozed for 1 day 📅";
            case "TOMORROW_9AM": return "Moved to tomorrow 9 AM ☀️";
            case "SKIP_TODAY": return "Cycle skipped 🚫";
            default: return "Updated successfully!";
        }
    }
}