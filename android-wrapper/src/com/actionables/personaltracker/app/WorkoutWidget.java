package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * \uD83C\uDFCB Workout (spec \u00A717): start/log today's workout or create a NEW workout \u2014
 * all through native popups, never by launching the app.
 */
public class WorkoutWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_workout);
        v.setOnClickPendingIntent(R.id.mic, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "scope", "workout", "voice", "1"));

        JSONObject p = st.latestPlan();
        boolean logged = st.workoutLoggedToday();
        v.setTextViewText(R.id.w_name, p != null ? p.optString("name", "Workout") : "No workout yet");
        v.setTextViewText(R.id.w_status, logged ? "Logged today \u2713" : "Not logged today");
        v.setTextColor(R.id.w_status, ctx.getColor(logged ? R.color.wg_green : R.color.wg_dim));

        if (p != null) {
            v.setTextViewText(R.id.btn_start, "\u25B6 Start");
            v.setOnClickPendingIntent(R.id.btn_start,
                    WidgetHub.popup(ctx, WidgetDialogActivity.A_START_WORKOUT, id, "planId", p.optString("id")));
        } else {
            v.setTextViewText(R.id.btn_start, "+ Create");
            v.setOnClickPendingIntent(R.id.btn_start, WidgetHub.popup(ctx, WidgetDialogActivity.A_NEW_WORKOUT, id));
        }
        v.setOnClickPendingIntent(R.id.btn_new, WidgetHub.popup(ctx, WidgetDialogActivity.A_NEW_WORKOUT, id));

        boolean small = bucket == WidgetHub.SMALL;
        v.setViewVisibility(R.id.btn_new, small && p != null ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.w_sub, small ? View.GONE : View.VISIBLE);
        return v;
    }
}
