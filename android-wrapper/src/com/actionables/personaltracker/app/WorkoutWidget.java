package com.actionables.personaltracker.app;

import android.content.Context;
import android.widget.RemoteViews;

/**
 * WORKOUT widget (v4): view-only scrollable list of available exercises with
 * personal-best / recency subtitles. Tap a row \u2192 exact exercise in-app.
 * No + by design (spec \u00A713).
 */
public class WorkoutWidget extends BaseWidget {

    @Override protected boolean hasList() { return true; }

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_workout);
        v.setRemoteAdapter(R.id.list, WidgetHub.listService(ctx, id, "workouts"));
        v.setEmptyView(R.id.list, R.id.empty);
        v.setPendingIntentTemplate(R.id.list, WidgetHub.listTemplate(ctx, id));
        return v;
    }
}
