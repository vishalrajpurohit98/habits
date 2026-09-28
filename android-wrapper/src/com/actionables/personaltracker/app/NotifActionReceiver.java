package com.actionables.personaltracker.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;

/** Handles the "Done" and "Snooze 1h" buttons on reminder notifications without opening the app. */
public class NotifActionReceiver extends BroadcastReceiver {
    public static final String DONE = "com.actionables.personaltracker.notif.DONE";
    public static final String SNOOZE = "com.actionables.personaltracker.notif.SNOOZE";
    static final long SNOOZE_MS = 60L * 60L * 1000L;

    @Override public void onReceive(Context c, Intent in) {
        String act = in.getAction() == null ? "" : in.getAction();
        int nid = in.getIntExtra("nid", 0);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        try {
            if (DONE.equals(act)) {
                String habit = in.getStringExtra("habit"), task = in.getStringExtra("task"), msg = null;
                WidgetStore st = WidgetStore.load(c);
                if (st == null) msg = "Open Momentum once to enable quick actions";
                else if (habit != null && !habit.isEmpty()) {
                    String t = WidgetStore.today(); JSONObject h = st.findHabit(habit);
                    if (h == null) msg = "Habit not found";
                    else if (WidgetStore.isDone(h, t)) msg = "Already done today";      // never un-complete from a notification
                    else { msg = st.toggleHabit(habit, t); if (msg == null) msg = st.commit(false) ? "Marked done" : "Unable to save"; }
                } else if (task != null && !task.isEmpty()) {
                    JSONObject t = st.findTask(task);
                    if (t == null) msg = "Task not found";
                    else if ("completed".equals(t.optString("status"))) msg = "Already completed";
                    else { st.toggleTask(task); msg = st.commit(false) ? "Task completed" : "Unable to save"; }
                }
                WidgetHub.refreshProviders(c, new Class<?>[]{HabitsWidget.class, TasksWidget.class});
                if (msg != null) WidgetActionReceiver.toast(c, msg);
                if (nm != null) nm.cancel(nid);
            } else if (SNOOZE.equals(act)) {
                Intent again = new Intent(c, NotifReceiver.class);
                if (in.getExtras() != null) again.putExtras(in.getExtras());
                again.removeExtra("nid");
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
                PendingIntent pi = PendingIntent.getBroadcast(c, nid ^ 0x5A5A, again, flags);
                AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
                long at = System.currentTimeMillis() + SNOOZE_MS;
                if (am != null) {
                    if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                    else am.set(AlarmManager.RTC_WAKEUP, at, pi);
                }
                if (nm != null) nm.cancel(nid);
                WidgetActionReceiver.toast(c, "Snoozed for 1 hour");
            }
        } catch (Exception e) {
            WidgetActionReceiver.toast(c, "Couldn't complete that action");
        }
    }
}
