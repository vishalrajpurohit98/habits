package com.actionables.personaltracker.app;

import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * \u26A1 Quick Log \u2014 universal quick-entry widget (spec \u00A75).
 * Selecting an activity shows its info + Add action; Add opens the native
 * popup (never MainActivity). Selection is stored per widget instance.
 */
public class QuickLogWidget extends BaseWidget {

    static String sel(Context ctx, int id) { return WidgetHub.getPref(ctx, "ql_" + id, ""); }

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quicklog);
        String s = sel(ctx, id);

        v.setOnClickPendingIntent(R.id.mic, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "scope", "all"));
        v.setOnClickPendingIntent(R.id.sel_row, WidgetHub.popup(ctx, WidgetDialogActivity.A_QUICK_PICK, id));

        // Summary line (Tasks / Habits / Expense today)
        int[] tc = st.todayTaskCounts();
        int[] hc = st.habitCounts();
        v.setTextViewText(R.id.st0v, String.valueOf(tc[3]));
        v.setTextViewText(R.id.st0l, tc[2] > 0 ? tc[2] + " overdue" : "Tasks open");
        v.setTextColor(R.id.st0l, ctx.getColor(tc[2] > 0 ? R.color.wg_red : R.color.wg_dim));
        v.setTextViewText(R.id.st1v, hc[0] + "/" + hc[1]);
        v.setTextViewText(R.id.st1l, "Habits");
        v.setTextViewText(R.id.st2v, st.inr(st.todayExpenseTotal()));
        v.setTextViewText(R.id.st2l, "Expense");

        String icon = "\u26A1", label = "Select activity";
        boolean hasSel = true;
        String info = "", sub = "", addLabel = "+ Add";
        String popupAction = null; String[] popupExtras = new String[0]; String aiScope = "all";
        switch (s) {
            case "task": {
                icon = "\u2713"; label = "Task"; aiScope = "task";
                info = "\u2713 TASK";
                sub = tc[3] + " open" + (tc[2] > 0 ? " \u00B7 " + tc[2] + " overdue" : "");
                addLabel = "+ Add Task"; popupAction = WidgetDialogActivity.A_ADD_TASK;
                break;
            }
            case "habit": {
                icon = "\uD83C\uDF31"; label = "Habit"; aiScope = "habit";
                info = "\uD83C\uDF31 HABIT";
                sub = hc[0] + " / " + hc[1] + " done today";
                addLabel = "+ Add Habit"; popupAction = WidgetDialogActivity.A_ADD_HABIT;
                break;
            }
            case "exp": {
                icon = st.currency(); label = "Expense"; aiScope = "money";
                info = st.currency() + " MONEY";
                sub = "Today: " + st.inr(st.todayExpenseTotal());
                addLabel = "+ Add Expense"; popupAction = WidgetDialogActivity.A_ADD_EXPENSE;
                break;
            }
            case "mood": {
                icon = "\uD83D\uDE42"; label = "Mood"; aiScope = "mood";
                int m = st.moodOf(WidgetStore.today());
                info = "\uD83D\uDE42 MOOD";
                sub = m >= 0 ? "Logged: " + WidgetStore.MOOD_EMOJI[m] + " " + WidgetStore.MOOD_LABEL[m] : "Not logged today";
                addLabel = "+ Log Mood"; popupAction = WidgetDialogActivity.A_MOOD_DETAIL;
                break;
            }
            case "workout": {
                icon = "\uD83C\uDFCB"; label = "Workout"; aiScope = "workout";
                JSONObject p = st.latestPlan();
                info = "\uD83C\uDFCB WORKOUT";
                sub = p != null ? p.optString("name") + (st.workoutLoggedToday() ? " \u00B7 logged \u2713" : "") : "No workout yet";
                addLabel = p != null ? "\u25B6 Start" : "+ New Workout";
                popupAction = p != null ? WidgetDialogActivity.A_START_WORKOUT : WidgetDialogActivity.A_NEW_WORKOUT;
                break;
            }
            case "sleep": {
                icon = "\uD83D\uDCA4"; label = "Sleep"; aiScope = "sleep";
                JSONObject sl = st.lastSleep();
                info = "\uD83D\uDCA4 SLEEP";
                sub = sl != null && sl.optInt("mins", 0) > 0
                        ? "Last: " + WidgetStore.durFmt(sl.optInt("mins")) : "Not logged yet";
                addLabel = "+ Log Sleep"; popupAction = WidgetDialogActivity.A_LOG_SLEEP;
                break;
            }
            case "ai": {
                icon = "\uD83C\uDF99"; label = "Ask AI"; aiScope = "all";
                info = "\uD83C\uDF99 ASK AI";
                sub = "\u201CSpent 500 on dinner\u201D \u00B7 \u201CAdd a task\u2026\u201D";
                addLabel = "\uD83C\uDF99 Speak"; popupAction = WidgetDialogActivity.A_AI;
                popupExtras = new String[]{"scope", "all", "voice", "1"};
                break;
            }
            default: hasSel = false;
        }

        v.setTextViewText(R.id.sel_icon, icon);
        v.setTextViewText(R.id.sel_label, label);
        v.setViewVisibility(R.id.panel, hasSel ? android.view.View.VISIBLE : android.view.View.GONE);
        if (hasSel) {
            v.setTextViewText(R.id.panel_info, info);
            v.setTextViewText(R.id.panel_sub, sub);
            v.setTextViewText(R.id.add_btn, addLabel);
            v.setOnClickPendingIntent(R.id.add_btn, WidgetHub.popup(ctx, popupAction, id, popupExtras));
            v.setOnClickPendingIntent(R.id.ai_btn,
                    WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "scope", aiScope, "voice", "1"));
        }

        // Responsive: small drops the summary + sub line so nothing clips (spec \u00A726).
        v.setViewVisibility(R.id.summary, bucket == WidgetHub.SMALL ? android.view.View.GONE : android.view.View.VISIBLE);
        v.setViewVisibility(R.id.panel_sub, bucket == WidgetHub.SMALL ? android.view.View.GONE : android.view.View.VISIBLE);
        return v;
    }
}
