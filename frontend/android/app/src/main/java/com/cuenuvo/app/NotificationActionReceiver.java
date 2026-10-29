package com.cuenuvo.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import android.util.Log;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationAction";
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String reminderId = intent.getStringExtra("reminderId");
        String actionId = intent.getStringExtra("actionId");
        
        // Retrieve the exact notification ID passed from the notification payload, fallback to hashCode if missing
        int notificationId = intent.getIntExtra("notificationId", reminderId != null ? reminderId.hashCode() : 1001);

        if (reminderId == null || actionId == null) return;

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // 1. SHOW PROGRESS STATE INSTANTLY IN THE TRAY
        NotificationCompat.Builder progressBuilder = new NotificationCompat.Builder(context, "reminders_channel")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setContentTitle("Cuenuvo")
                .setContentText(getProgressMessage(actionId))
                .setProgress(0, 0, true) // Indeterminate loading spinner
                .setOngoing(true)        // Prevent user from swiping away mid-sync
                .setAutoCancel(false);

        notificationManager.notify(notificationId, progressBuilder.build());

        // 2. EXECUTE BACKGROUND NETWORK SYNC TO OCI BACKEND
        executorService.execute(() -> {
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
                Log.d(TAG, "Backend sync response code: " + responseCode);

                if (responseCode >= 200 && responseCode < 300) {
                    // 3. SUCCESS STATE: Show confirmation briefly, then auto-cancel
                    NotificationCompat.Builder successBuilder = new NotificationCompat.Builder(context, "reminders_channel")
                            .setSmallIcon(android.R.drawable.checkbox_on_background)
                            .setContentTitle("Cuenuvo")
                            .setContentText(getSuccessMessage(actionId))
                            .setOngoing(false)
                            .setAutoCancel(true)
                            .setTimeoutAfter(1000); // Disappears after 1 second

                    notificationManager.notify(notificationId, successBuilder.build());
                } else {
                    throw new Error("Server returned HTTP code: " + responseCode);
                }

            } catch (Exception e) {
                Log.e(TAG, "Failed to sync notification action with VM backend", e);

                // 4. ERROR STATE
                NotificationCompat.Builder errorBuilder = new NotificationCompat.Builder(context, "reminders_channel")
                        .setSmallIcon(android.R.drawable.ic_dialog_alert)
                        .setContentTitle("Cuenuvo")
                        .setContentText("Failed to update. Tap to retry.")
                        .setOngoing(false)
                        .setAutoCancel(true);

                notificationManager.notify(notificationId, errorBuilder.build());
            }
        });
    }

    private String getProgressMessage(String actionId) {
        switch (actionId) {
            case "MARK_COMPLETE":
            case "MARK_PAID":
            case "DONE":
                return "Marking as completed...";
            case "PLUS_1H":
                return "Snoozing for 1 hour...";
            case "PLUS_1D":
                return "Snoozing for 1 day...";
            case "TOMORROW_9AM":
                return "Setting for tomorrow 9 AM...";
            case "SKIP_TODAY":
                return "Skipping today's cycle...";
            default:
                return "Updating reminder...";
        }
    }

    private String getSuccessMessage(String actionId) {
        switch (actionId) {
            case "MARK_COMPLETE":
            case "MARK_PAID":
            case "DONE":
                return "Completed ✓";
            case "PLUS_1H":
                return "Snoozed for 1 hour ⏰";
            case "PLUS_1D":
                return "Snoozed for 1 day 📅";
            case "TOMORROW_9AM":
                return "Moved to tomorrow 9 AM ☀️";
            case "SKIP_TODAY":
                return "Cycle skipped 🚫";
            default:
                return "Updated successfully!";
        }
    }
}
