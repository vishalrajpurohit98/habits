package com.actionables.personaltracker.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/**
 * Common plumbing for all HabitTracker widgets. Subclasses implement
 * {@link #render} and get update / resize / delete handling for free.
 */
public abstract class BaseWidget extends AppWidgetProvider {

    /** Build the RemoteViews for one widget instance at the given size bucket. */
    protected abstract RemoteViews render(Context ctx, WidgetStore st, int widgetId, int bucket);

    /** Widgets backed by a ListView adapter override this so refreshes also
        invalidate their RemoteViewsFactory data. */
    protected boolean hasList() { return false; }

    /** The module this widget belongs to ("money", "tasks", "workouts"), or null. */
    protected String module() { return null; }

    private static String moduleName(String m) { return "money".equals(m) ? "Money" : "tasks".equals(m) ? "Tasks" : "workouts".equals(m) ? "Workouts" : m; }

    private RemoteViews offView(Context ctx, String m) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_off);
        v.setTextViewText(R.id.off_title, moduleName(m) + " is off");
        v.setOnClickPendingIntent(R.id.off_root, WidgetHub.openAppDeep(ctx, "tab", "pgSet"));
        return v;
    }

    @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        WidgetStore st = WidgetStore.load(ctx);
        for (int id : ids) push(ctx, mgr, st, id);
    }

    @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle newOptions) {
        push(ctx, mgr, WidgetStore.load(ctx), id);
    }

    @Override public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetHub.clearWidgetPrefs(ctx, id);
    }

    private void push(Context ctx, AppWidgetManager mgr, WidgetStore st, int id) {
        try {
            String m = module();
            mgr.updateAppWidget(id, (m != null && !st.moduleOn(m)) ? offView(ctx, m) : render(ctx, st, id, WidgetHub.bucket(mgr, id)));
        } catch (Exception ignored) { /* a broken render must never crash the launcher */ }
    }
}
