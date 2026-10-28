package com.cuenuvo.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.NotificationManager;
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

        Log.d(TAG, "Action tapped: " + actionId + " for reminder: " + reminderId);

        // 1. Immediately dismiss the notification shade
        if (reminderId != null) {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(reminderId.hashCode());
        }

        if (reminderId == null || actionId == null) return;

        // 2. Perform background HTTP request to your Oracle VM backend webhook
        executorService.execute(() -> {
            try {
                // Replace with your actual Oracle VM backend webhook URL or IP
                URL url = new URL("https://cuenuvo.com/api/notifications/action"); 
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
                Log.d(TAG, "Backend action sync response code: " + responseCode);
            } catch (Exception e) {
                Log.e(TAG, "Failed to sync notification action with VM backend", e);
            }
        });
    }
}