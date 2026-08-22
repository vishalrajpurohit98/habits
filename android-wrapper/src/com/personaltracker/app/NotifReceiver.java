package com.personaltracker.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.graphics.Color;

public class NotifReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent in) {
        String habit = in.getStringExtra("habit");
        String name = in.getStringExtra("name");
        String emoji = in.getStringExtra("emoji");
        String id = in.getStringExtra("id");
        String date = in.getStringExtra("date");
        String type = in.getStringExtra("type");

        Intent open = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (habit != null) open.putExtra("habit", habit);
        if (date != null) open.putExtra("date", date);
        if (type != null) open.putExtra("type", type);

        int piCode = Math.abs((id == null ? "n" : id).hashCode());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pi = PendingIntent.getActivity(c, piCode, open, flags);

        boolean isMissed = "missed".equals(type);
        String title = (emoji == null ? "\uD83D\uDD14" : emoji) + " " + (name == null ? "Reminder" : name);
        String body = isMissed
                ? "You haven\u2019t completed this today \u2014 still time!"
                : "Time for your habit \u2014 keep the chain alive.";

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, NativeAlarms.CHANNEL_ID)
                : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.app_icon)
         .setContentTitle(title)
         .setContentText(body)
         .setAutoCancel(true)
         .setContentIntent(pi)
         .setCategory(Notification.CATEGORY_REMINDER)
         .setColor(Color.rgb(255, 174, 31));

        int notifId = Math.abs((id == null ? String.valueOf(System.currentTimeMillis()) : id).hashCode());
        ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(notifId, b.build());
    }
}
