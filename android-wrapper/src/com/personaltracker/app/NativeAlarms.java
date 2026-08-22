package com.personaltracker.app;

import android.app.*;
import android.content.*;
import android.os.*;
import org.json.*;
import java.util.*;

public class NativeAlarms {
    public static final String CHANNEL_ID = "habit_reminders_v1";
    static final String PREF = "scheduled_alarms_json";
    static final String ACTION = "com.personaltracker.ACTION_REMINDER";
    static final int TEST_CODE = 0x7F00AA11;

    static AlarmManager am(Context c) { return (AlarmManager) c.getSystemService(Context.ALARM_SERVICE); }

    static PendingIntent pi(Context c, int code, JSONObject a) {
        Intent i = new Intent(c, NotifReceiver.class).setAction(ACTION);
        try {
            i.putExtra("habit", a.optString("h", ""));
            i.putExtra("name", a.optString("n", "Reminder"));
            i.putExtra("emoji", a.optString("e", "\uD83D\uDD14"));
            i.putExtra("id", a.optString("c", String.valueOf(code)));
            i.putExtra("date", a.optString("d", ""));
            i.putExtra("type", a.optString("type", "reminder"));
        } catch (Exception ignored) {}
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(c, code, i, flags);
    }

    static void cancelStored(Context c) {
        String old = c.getSharedPreferences(PREF, 0).getString("json", "[]");
        try {
            JSONArray arr = new JSONArray(old);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.getJSONObject(i);
                int code = a.optInt("c", 0);
                if (code != 0) am(c).cancel(pi(c, code, a));
            }
        } catch (Exception ignored) {}
    }

    public static void schedule(Context c, String json) {
        cancelStored(c);
        if (json == null) json = "[]";
        c.getSharedPreferences(PREF, 0).edit().putString("json", json).apply();
        try {
            JSONArray arr = new JSONArray(json);
            Set<Integer> scheduled = new HashSet<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.getJSONObject(i);
                long t = a.optLong("t", 0);
                int code = a.optInt("c", 0);
                if (code == 0 || t <= System.currentTimeMillis()) continue;
                if (scheduled.contains(code)) continue; // prevent duplicates
                scheduled.add(code);
                set(c, code, a, t);
            }
        } catch (Exception ignored) {}
    }

    static void set(Context c, int code, JSONObject a, long t) {
        PendingIntent p = pi(c, code, a);
        AlarmManager x = am(c);
        try {
            if (Build.VERSION.SDK_INT >= 31 && x.canScheduleExactAlarms()) {
                x.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, p);
            } else if (Build.VERSION.SDK_INT >= 23) {
                x.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, p);
            } else {
                x.set(AlarmManager.RTC_WAKEUP, t, p);
            }
        } catch (SecurityException se) {
            // Fallback: inexact alarm if exact not permitted
            try { x.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, p); } catch (Exception ignored) {}
        }
    }

    public static void restore(Context c) {
        String json = c.getSharedPreferences(PREF, 0).getString("json", "[]");
        try {
            JSONArray arr = new JSONArray(json);
            Set<Integer> scheduled = new HashSet<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject a = arr.getJSONObject(i);
                long t = a.optLong("t", 0);
                int code = a.optInt("c", 0);
                if (t > System.currentTimeMillis() && code != 0 && !scheduled.contains(code)) {
                    scheduled.add(code);
                    set(c, code, a, t);
                }
            }
        } catch (Exception ignored) {}
    }

    public static void test(Context c) {
        JSONObject a = new JSONObject();
        try {
            a.put("h", "test"); a.put("n", "Test reminder"); a.put("e", "\uD83D\uDD14"); a.put("c", TEST_CODE);
        } catch (Exception ignored) {}
        set(c, TEST_CODE, a, System.currentTimeMillis() + 5000);
    }
}
