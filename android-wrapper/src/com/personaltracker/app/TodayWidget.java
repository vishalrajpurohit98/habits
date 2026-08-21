package com.personaltracker.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class TodayWidget extends AppWidgetProvider {
    private static final String PREF = "actionables_widget";

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
    }

    public static void update(Context context, AppWidgetManager manager, int id) {
        SharedPreferences p = context.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        String title = p.getString("title", "Personal Tracker");
        String momentum = p.getString("momentum", "—");
        String next = p.getString("next", "Open the app to plan today");
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        v.setTextViewText(R.id.widgetTitle, title);
        v.setTextViewText(R.id.widgetMomentum, momentum);
        v.setTextViewText(R.id.widgetNext, next);
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            PendingIntent pi = PendingIntent.getActivity(context, 701, launch,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.widgetRoot, pi);
        }
        manager.updateAppWidget(id, v);
    }
}
