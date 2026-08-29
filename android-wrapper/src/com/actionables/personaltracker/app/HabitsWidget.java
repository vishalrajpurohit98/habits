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
        v.setTextViewText(R.id.hcount, rows.isEmpty() ? "" : done + "/" + rows.size());
        v.setProgressBar(R.id.hbar, 100, rows.isEmpty() ? 0 : Math.round(done * 100f / rows.size()), false);
        return v;
    }
}
