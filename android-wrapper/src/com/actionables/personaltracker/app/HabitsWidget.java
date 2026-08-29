package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import java.util.List;

/**
 * Habits widget (v2): today's habits only, quota-aware (met targets show as
 * trophies). Circle completes; tapping the name opens the native habit editor.
 */
public class HabitsWidget extends BaseWidget {

    static final int[] BOX = {R.id.h1_box, R.id.h2_box, R.id.h3_box, R.id.h4_box, R.id.h5_box, R.id.h6_box};
    static final int[] CHK = {R.id.h1_chk, R.id.h2_chk, R.id.h3_chk, R.id.h4_chk, R.id.h5_chk, R.id.h6_chk};
    static final int[] TIT = {R.id.h1_title, R.id.h2_title, R.id.h3_title, R.id.h4_title, R.id.h5_title, R.id.h6_title};
    static final int[] MET = {R.id.h1_meta, R.id.h2_meta, R.id.h3_meta, R.id.h4_meta, R.id.h5_meta, R.id.h6_meta};

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_habits);
        v.setOnClickPendingIntent(R.id.add_btn, WidgetHub.popup(ctx, WidgetDialogActivity.A_ADD_HABIT, id));

        List<WidgetStore.HabitRow> rows = st.habitsToday();
        int slots = bucket == WidgetHub.LARGE ? 6 : bucket == WidgetHub.MEDIUM ? 4 : 2;
        boolean showMeta = bucket != WidgetHub.SMALL;
        int shown = Math.min(slots, rows.size()), done = 0;
        for (WidgetStore.HabitRow r : rows) if (r.done) done++;

        for (int i = 0; i < BOX.length; i++) {
            if (i < shown) {
                WidgetStore.HabitRow r = rows.get(i);
                v.setViewVisibility(BOX[i], View.VISIBLE);
                v.setTextViewText(TIT[i], (r.trophy ? "\uD83C\uDFC6 " : r.emoji + " ") + r.name);
                v.setTextColor(TIT[i], ctx.getColor(r.done ? R.color.wg_dim : R.color.wg_ink));
                v.setTextViewText(CHK[i], r.done ? "\u2713" : "");
                v.setInt(CHK[i], "setBackgroundResource", r.done ? R.drawable.chk_habit_on : R.drawable.chk_habit_off);
                String meta = r.meta == null ? "" : r.meta;
                v.setTextViewText(MET[i], meta);
                v.setViewVisibility(MET[i], showMeta && !meta.isEmpty() ? View.VISIBLE : View.GONE);
                v.setOnClickPendingIntent(CHK[i], WidgetHub.broadcast(ctx, WidgetActionReceiver.TOGGLE_HABIT, id, "habitId", r.id));
                v.setOnClickPendingIntent(TIT[i], WidgetHub.popup(ctx, WidgetDialogActivity.A_EDIT_HABIT, id, "habitId", r.id));
            } else v.setViewVisibility(BOX[i], View.GONE);
        }

        v.setViewVisibility(R.id.empty, rows.isEmpty() ? View.VISIBLE : View.GONE);
        int total = rows.size();
        v.setTextViewText(R.id.hcount, total == 0 ? "" : done + "/" + total
                + (rows.size() > shown ? "  \u00B7  \uFF0B" + (rows.size() - shown) : ""));
        v.setProgressBar(R.id.hbar, 100, total == 0 ? 0 : Math.round(done * 100f / total), false);
        return v;
    }
}
