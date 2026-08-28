package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * \uD83D\uDCA4 Sleep (spec \u00A722): last night's sleep at a glance + quick logging via a
 * native popup with automatic duration calculation.
 */
public class SleepWidget extends BaseWidget {

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_sleep);
        v.setOnClickPendingIntent(R.id.mic, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "scope", "sleep", "voice", "1"));
        v.setOnClickPendingIntent(R.id.btn_log, WidgetHub.popup(ctx, WidgetDialogActivity.A_LOG_SLEEP, id));

        JSONObject e = st.lastSleep();
        if (e == null || e.optInt("mins", 0) <= 0) {
            v.setTextViewText(R.id.s_sub, "LAST NIGHT");
            v.setTextViewText(R.id.s_dur, "\u2014");
            v.setTextViewText(R.id.s_range, "Not logged yet");
        } else {
            String d = e.optString("d", "");
            v.setTextViewText(R.id.s_sub, d.equals(WidgetStore.today()) ? "LAST NIGHT" : WidgetStore.niceDate(d).toUpperCase());
            v.setTextViewText(R.id.s_dur, WidgetStore.durFmt(e.optInt("mins", 0)));
            String bed = e.optString("bed", ""), wake = e.optString("wake", "");
            v.setTextViewText(R.id.s_range, !bed.isEmpty() && !wake.isEmpty()
                    ? WidgetStore.time12(bed) + " \u2013 " + WidgetStore.time12(wake) : "");
        }
        v.setViewVisibility(R.id.s_range, bucket == WidgetHub.SMALL ? View.GONE : View.VISIBLE);
        return v;
    }
}
