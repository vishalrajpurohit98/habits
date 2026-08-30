package com.actionables.personaltracker.app;

import android.content.Context;
import android.widget.RemoteViews;

import java.util.List;

/**
 * HABITS widget (v4): scrollable list of TODAY's habits only (quota-met habits
 * hidden per schedule rules). Circle = quick check-in (+1 for count habits).
 * Row body = exact habit detail in-app. Large + = New Habit only.
 */
public class HabitsWidget extends BaseWidget {

    @Override protected boolean hasList() { return true; }

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_habits);
        v.setOnClickPendingIntent(R.id.add_btn, WidgetHub.openAppDeep(ctx, "addHabit", "1"));

        v.setRemoteAdapter(R.id.list, WidgetHub.listService(ctx, id, "habits"));
        v.setEmptyView(R.id.list, R.id.empty);
        v.setPendingIntentTemplate(R.id.list, WidgetHub.listTemplate(ctx, id));

        List<WidgetStore.HabitRow> rows = st.habitsToday();
        int done = 0;
        for (WidgetStore.HabitRow r : rows) if (r.done) done++;
        int pct = rows.isEmpty() ? 0 : Math.round(done * 100f / rows.size());
        v.setTextViewText(R.id.h_sub, rows.isEmpty() ? "" : done + " / " + rows.size() + " completed");
        v.setViewVisibility(R.id.h_sub, bucket == WidgetHub.SMALL || rows.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
        v.setProgressBar(R.id.hbar, 100, pct, false);
        v.setTextViewText(R.id.h_pct, pct + "%");
        v.setTextViewText(R.id.empty, "No habits scheduled today");
        return v;
    }
}
