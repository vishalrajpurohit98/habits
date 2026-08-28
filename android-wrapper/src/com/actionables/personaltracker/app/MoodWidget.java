package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/** Mood widget (v2): a pure one-tap emoji strip; footer appears with space. */
public class MoodWidget extends BaseWidget {

    static final int[] M = {R.id.m0, R.id.m1, R.id.m2, R.id.m3, R.id.m4, R.id.m5, R.id.m6};

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_mood);
        int cur = st.moodOf(WidgetStore.today());
        boolean tiny = WidgetHub.cols(ctx, id) <= 2;

        for (int i = 0; i < 7; i++) {
            boolean hide = tiny && (i == 0 || i == 4);
            v.setViewVisibility(M[i], hide ? View.GONE : View.VISIBLE);
            if (hide) continue;
            v.setTextViewText(M[i], WidgetStore.MOOD_EMOJI[i]);
            v.setInt(M[i], "setBackgroundResource", i == cur ? R.drawable.widget_inner : 0);
            v.setOnClickPendingIntent(M[i], WidgetHub.broadcast(ctx, WidgetActionReceiver.SET_MOOD, id, "mood", String.valueOf(i)));
        }

        boolean foot = WidgetHub.rows(ctx, id) >= 2;
        v.setViewVisibility(R.id.mfoot, foot ? View.VISIBLE : View.GONE);
        if (foot) {
            v.setTextViewText(R.id.status, cur >= 0 ? WidgetStore.MOOD_LABEL[cur] : "How do you feel?");
            v.setViewVisibility(R.id.btn_more, cur >= 0 ? View.VISIBLE : View.GONE);
            v.setOnClickPendingIntent(R.id.btn_more, WidgetHub.popup(ctx, WidgetDialogActivity.A_MOOD_DETAIL, id));
        }
        return v;
    }
}
