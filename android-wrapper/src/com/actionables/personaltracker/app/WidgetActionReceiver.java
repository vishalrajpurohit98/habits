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
                    if (!st.commit()) msg = "Unable to save task";
                    if (msg != null) toast(ctx, msg);
                    break;
                }
                case TOGGLE_HABIT: {
                    String id = in.getStringExtra("habitId");
                    String err = id == null ? "Habit not found" : st.toggleHabit(id, WidgetStore.today());
                    if (err != null) { toast(ctx, err); WidgetHub.refreshAll(ctx); }
                    else if (!st.commit()) toast(ctx, "Unable to save habit");
                    break;
                }
                case SET_MOOD: {
                    int i = parse(in.getStringExtra("mood"));
                    String t = WidgetStore.today();
                    int cur = st.moodOf(t);
                    st.setMood(t, i == cur ? -1 : i, null); // tapping the same mood clears (like the app)
                    if (!st.commit()) toast(ctx, "Unable to save mood");
                    else if (i != cur && i >= 0 && i < WidgetStore.MOOD_LABEL.length)
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

    static int parse(String s) { try { return Integer.parseInt(s); } catch (Exception e) { return -1; } }

    static void toast(Context ctx, String msg) {
        try { Toast.makeText(ctx.getApplicationContext(), msg, Toast.LENGTH_SHORT).show(); } catch (Exception ignored) {}
    }
}
