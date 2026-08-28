package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Workout widget (v2): today's plan, logged state, last session, start/new. */
public class WorkoutWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_workout);
        JSONObject plan = st.latestPlan();
        boolean logged = st.workoutLoggedToday();

        if (plan != null) {
            v.setTextViewText(R.id.w_name, plan.optString("name", "Workout"));
            v.setTextViewText(R.id.w_status, logged ? "Logged \u2713" : "Not logged yet");
            v.setTextColor(R.id.w_status, ctx.getColor(logged ? R.color.wg_green : R.color.wg_dim));
            v.setTextViewText(R.id.btn_start, logged ? "\uFF0B Log more" : "\u25B6 Start");
            v.setOnClickPendingIntent(R.id.btn_start, WidgetHub.popup(ctx, WidgetDialogActivity.A_START_WORKOUT, id, "planId", plan.optString("id")));
            v.setOnClickPendingIntent(R.id.w_name, WidgetHub.popup(ctx, WidgetDialogActivity.A_START_WORKOUT, id, "planId", plan.optString("id")));
        } else {
            v.setTextViewText(R.id.w_name, "No plan");
            v.setTextViewText(R.id.w_status, "Create one to get moving");
            v.setTextColor(R.id.w_status, ctx.getColor(R.color.wg_dim));
            v.setTextViewText(R.id.btn_start, "\uFF0B Create");
            v.setOnClickPendingIntent(R.id.btn_start, WidgetHub.popup(ctx, WidgetDialogActivity.A_NEW_WORKOUT, id));
            v.setOnClickPendingIntent(R.id.w_name, WidgetHub.popup(ctx, WidgetDialogActivity.A_NEW_WORKOUT, id));
        }
        v.setOnClickPendingIntent(R.id.btn_new, WidgetHub.popup(ctx, WidgetDialogActivity.A_NEW_WORKOUT, id));
        v.setViewVisibility(R.id.btn_new, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);

        String last = st.lastWorkoutLine();
        v.setTextViewText(R.id.w_last, last == null ? "" : "Last: " + last);
        v.setViewVisibility(R.id.w_last, last != null && bucket != WidgetHub.SMALL ? View.VISIBLE : View.GONE);
        return v;
    }
}
