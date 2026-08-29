package com.actionables.personaltracker.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

/**
 * Handles direct (no-popup) widget actions: task/habit toggles and one-tap
 * mood. Mutations go through WidgetStore against the app's own state, then
 * every widget refreshes. Failures always surface a message (spec \u00A739 \u2014 no
 * dead taps). Also refreshes widgets when the date/time zone changes so
 * "today" never goes stale.
 */
public class WidgetActionReceiver extends BroadcastReceiver {

    public static final String ACTION_PREFIX = "com.actionables.personaltracker.widget.";
    public static final String TOGGLE_TASK = "TOGGLE_TASK";
    public static final String TOGGLE_HABIT = "TOGGLE_HABIT";
    public static final String SET_MOOD = "SET_MOOD";
    public static final String LIST_CLICK = "LIST_CLICK";
    public static final String SET_TFILTER = "SET_TFILTER";

    @Override public void onReceive(Context ctx, Intent in) {
        String action = in.getAction() == null ? "" : in.getAction();
        try {
            if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
                    || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
                WidgetHub.refreshAll(ctx);
                return;
            }
            if (!action.startsWith(ACTION_PREFIX)) return;
            String op = action.substring(ACTION_PREFIX.length());
            WidgetStore st = WidgetStore.load(ctx);
            switch (op) {
                case TOGGLE_TASK: {
                    String id = in.getStringExtra("taskId");
                    String msg = id == null ? "Task not found" : st.toggleTask(id);
                    if (!st.commit(false)) msg = "Unable to save task";
                    else WidgetHub.refreshProviders(ctx, new Class<?>[]{TasksWidget.class, HabitsWidget.class});
                    if (msg != null) toast(ctx, msg);
                    break;
                }
                case TOGGLE_HABIT: {
                    String id = in.getStringExtra("habitId");
                    String err = id == null ? "Habit not found" : st.toggleHabit(id, WidgetStore.today());
                    if (err != null) { toast(ctx, err); WidgetHub.refreshProviders(ctx, new Class<?>[]{HabitsWidget.class}); }
                    else if (!st.commit(false)) toast(ctx, "Unable to save habit");
                    else WidgetHub.refreshProviders(ctx, new Class<?>[]{HabitsWidget.class, TasksWidget.class});
                    break;
                }
                case LIST_CLICK: {
                    String lop = in.getStringExtra("op") == null ? "" : in.getStringExtra("op");
                    String lid = in.getStringExtra("id");
                    if (lid == null) break;
                    switch (lop) {
                        case "toggle_task": {
                            String msg = st.toggleTask(lid);
                            if (!st.commit(false)) msg = "Unable to save task";
                            else WidgetHub.refreshProviders(ctx, new Class<?>[]{TasksWidget.class, HabitsWidget.class});
                            if (msg != null) toast(ctx, msg);
                            break;
                        }
                        case "toggle_habit": {
                            boolean ok = st.bumpHabit(lid);
                            if (!ok || !st.commit(false)) toast(ctx, "Unable to save habit");
                            else WidgetHub.refreshProviders(ctx, new Class<?>[]{HabitsWidget.class, TasksWidget.class});
                            break;
                        }
                        case "open_task": launchApp(ctx, "task", lid); break;
                        case "open_habit": launchApp(ctx, "habit", lid); break;
                        case "open_workout": launchApp(ctx, "workout", lid); break;
                    }
                    break;
                }
                case SET_TFILTER: {
                    int wid = in.getIntExtra("widgetId", 0);
                    String val = "overdue".equals(in.getStringExtra("val")) ? "overdue" : "today";
                    if (wid != 0) {
                        WidgetHub.setPref(ctx, "tf_" + wid, val);
                        WidgetHub.refreshProviders(ctx, new Class<?>[]{TasksWidget.class});
                    }
                    break;
                }
                case SET_MOOD: {
                    int i = parse(in.getStringExtra("mood"));
                    String t = WidgetStore.today();
                    int cur = st.moodOf(t);
                    st.setMood(t, i == cur ? -1 : i, null); // tapping the same mood clears (like the app)
                    if (!st.commit(false)) toast(ctx, "Unable to save mood");
                    else { WidgetHub.refreshProviders(ctx, new Class<?>[]{MoodWidget.class}); }
                    if (st != null && i != cur && i >= 0 && i < WidgetStore.MOOD_LABEL.length)
                        toast(ctx, WidgetStore.MOOD_EMOJI[i] + " " + WidgetStore.MOOD_LABEL[i] + " logged");
                    break;
                }
                default:
                    WidgetHub.refreshAll(ctx);
            }
        } catch (Exception e) {
            toast(ctx, "Something went wrong \u2014 please try again");
            WidgetHub.refreshAll(ctx);
        }
    }

    /** Exact-item deep link from a list row: bring the app to the precise screen. */
    static void launchApp(Context ctx, String key, String id) {
        try {
            Intent i = new Intent(ctx, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            i.putExtra(key, id);
            ctx.startActivity(i);
        } catch (Exception e) { toast(ctx, "Unable to open the app"); }
    }

    static int parse(String s) { try { return Integer.parseInt(s); } catch (Exception e) { return -1; } }

    static void toast(Context ctx, String msg) {
        try { Toast.makeText(ctx.getApplicationContext(), msg, Toast.LENGTH_SHORT).show(); } catch (Exception ignored) {}
    }
}
