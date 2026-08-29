package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Progress widget (v2). The class keeps its original name so widgets already
 * placed on home screens seamlessly upgrade to the new design on app update.
 * Shows today's combined completion, streak, habit/task stats (tap to add),
 * today's mood (tap to edit) and the last 7 days.
 */
public class QuickLogWidget extends BaseWidget {

    static final int[] DOT = {R.id.d0, R.id.d1, R.id.d2, R.id.d3, R.id.d4, R.id.d5, R.id.d6};

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quicklog);
        int[] hc = st.habitCounts();
        int[] tc = st.todayTaskCounts();
        int done = hc[0] + tc[0], total = hc[1] + tc[1];
        v.setTextViewText(R.id.pct, total > 0 ? Math.round(done * 100f / total) + "%" : "\u2014");
        v.setProgressBar(R.id.pbar, 100, total > 0 ? Math.round(done * 100f / total) : 0, false);

        int mx = st.maxStreak();
        v.setTextViewText(R.id.streak, mx > 0 ? "\uD83D\uDD25 " + mx : "");

        v.setTextViewText(R.id.st_h, "\uD83C\uDF31 " + hc[0] + "/" + hc[1]);
        v.setTextViewText(R.id.st_t, "\u2713 " + tc[0] + "/" + tc[1] + (tc[2] > 0 ? " \u00B7 " + tc[2] + "!" : ""));
        v.setTextColor(R.id.st_t, tc[2] > 0 ? 0xFFFF6B5E : 0xFF5B9DFF);
        v.setOnClickPendingIntent(R.id.st_h, WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_HABIT, id));
        v.setOnClickPendingIntent(R.id.st_t, WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_TASK, id));

        int mood = st.moodOf(WidgetStore.today());
        v.setTextViewText(R.id.st_m, mood >= 0 ? WidgetStore.MOOD_EMOJI[mood] : "\uD83D\uDE36");
        v.setOnClickPendingIntent(R.id.st_m, WidgetHub.popup(ctx, WidgetDialogActivity.A_MOOD_DETAIL, id));

        int[] dots = st.weekDots();
        for (int i = 0; i < 7; i++) {
            int c = dots[i] == 3 ? R.color.wg_green : dots[i] == 2 ? R.color.wg_acc
                    : dots[i] == 1 ? R.color.wg_red : R.color.wg_line;
            v.setTextViewText(DOT[i], dots[i] == 0 ? "\u00B7" : "\u25CF");
            v.setTextColor(DOT[i], ctx.getColor(c));
        }

        v.setViewVisibility(R.id.dots, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);
        return v;
    }
}
