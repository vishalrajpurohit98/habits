package com.actionables.personaltracker.app;

import android.content.Context;
import android.widget.RemoteViews;

/**
 * One "log everything" widget. Each cell opens the app straight to the relevant
 * logging flow via deep-link extras that MainActivity.getLaunchAction() reads
 * (handleAndroidBack/handleLaunchAction routes them). The AI cell opens the AI tab.
 */
public class LogHubWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_loghub);
        v.setOnClickPendingIntent(R.id.lh_habit,   WidgetHub.openAppDeep(ctx, "viewHabits", "1"));
        v.setOnClickPendingIntent(R.id.lh_task,    WidgetHub.openAppDeep(ctx, "addTask", "1"));
        v.setOnClickPendingIntent(R.id.lh_mood,    WidgetHub.openAppDeep(ctx, "addMood", "1"));
        v.setOnClickPendingIntent(R.id.lh_sleep,   WidgetHub.openAppDeep(ctx, "addSleep", "1"));
        v.setOnClickPendingIntent(R.id.lh_journal, WidgetHub.openAppDeep(ctx, "addJournal", "1"));
        v.setOnClickPendingIntent(R.id.lh_ai,      WidgetHub.openAppDeep(ctx, "tab", "pgAI"));
        return v;
    }
}
