package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Sleep widget (v2): last night at a glance; tapping opens the log/edit popup. */
public class SleepWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_sleep);
        JSONObject s = st.lastSleep();
        String today = WidgetStore.today();

        if (s != null && s.optInt("mins", 0) > 0) {
            int mins = s.optInt("mins");
            v.setTextViewText(R.id.s_dur, (mins / 60) + "h " + (mins % 60) + "m");
            v.setTextViewText(R.id.s_range, s.optString("bed", "") + " \u2192 " + s.optString("wake", ""));
            v.setTextViewText(R.id.s_sub, today.equals(s.optString("d")) ? "" : WidgetStore.niceDate(s.optString("d")).toUpperCase());
        } else {
            v.setTextViewText(R.id.s_dur, "\u2014");
            v.setTextViewText(R.id.s_range, "Tap to log last night");
            v.setTextViewText(R.id.s_sub, "");
        }
        v.setViewVisibility(R.id.s_range, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);
        v.setOnClickPendingIntent(R.id.sleep_tap, WidgetHub.popup(ctx, WidgetDialogActivity.A_LOG_SLEEP, id));
        return v;
    }
}
