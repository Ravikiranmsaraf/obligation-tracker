package com.cuenuvo.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import org.json.JSONArray;
import org.json.JSONObject;

public class CustomFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        if (remoteMessage.getData().size() > 0) {
            String title = remoteMessage.getNotification() != null ? remoteMessage.getNotification().getTitle() : "Cuenuvo Reminder";
            String body = remoteMessage.getNotification() != null ? remoteMessage.getNotification().getBody() : "You have a pending reminder.";
            String reminderId = remoteMessage.getData().get("reminderId");
            String actionsJson = remoteMessage.getData().get("actions");

            showNotificationWithActions(title, body, reminderId, actionsJson);
        }
    }

    private void showNotificationWithActions(String title, String body, String reminderId, String actionsJson) {
        String channelId = "cuenuvo_reminders";
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Reminders", NotificationManager.IMPORTANCE_HIGH);
            notificationManager.createNotificationChannel(channel);
        }

        // Intent when tapping the main notification body (Opens App)
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("reminderId", reminderId);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, reminderId.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        // Parse dynamic actions and add buttons
        try {
            if (actionsJson != null) {
                JSONArray actions = new JSONArray(actionsJson);
                for (int i = 0; i < actions.length(); i++) {
                    JSONObject action = actions.getJSONObject(i);
                    String actionId = action.getString("id");
                    String label = action.getString("label");

                    // Create an intent that triggers a BroadcastReceiver or opens app with action payload
                    Intent actionIntent = new Intent(this, NotificationActionReceiver.class);
                    actionIntent.setAction("com.cuenuvo.app.ACTION_" + actionId);
                    actionIntent.putExtra("reminderId", reminderId);
                    actionIntent.putExtra("actionId", actionId);

                    PendingIntent actionPendingIntent = PendingIntent.getBroadcast(
                            this,
                            (reminderId + "_" + actionId).hashCode(),
                            actionIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    builder.addAction(new NotificationCompat.Action.Builder(0, label, actionPendingIntent).build());
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        notificationManager.notify(reminderId.hashCode(), builder.build());
    }
}