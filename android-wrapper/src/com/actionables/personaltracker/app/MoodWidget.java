package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/**
 * \uD83D\uDE42 Mood (spec \u00A720): one tap saves immediately using the app's real mood
 * scale; tapping the same mood again clears it (matching setMood()).
 */
public class MoodWidget extends BaseWidget {

    static final int[] M = {R.id.m0, R.id.m1, R.id.m2, R.id.m3, R.id.m4, R.id.m5, R.id.m6};

    @Override protected RemoteViews render(Context ctx, WidgetStore st, int id, int bucket) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_mood);
        v.setOnClickPendingIntent(R.id.mic, WidgetHub.popup(ctx, WidgetDialogActivity.A_AI, id, "scope", "mood", "voice", "1"));
        v.setOnClickPendingIntent(R.id.btn_more, WidgetHub.popup(ctx, WidgetDialogActivity.A_MOOD_DETAIL, id));

        int cur = st.moodOf(WidgetStore.today());
        boolean small = bucket == WidgetHub.SMALL;
        for (int i = 0; i < M.length; i++) {
            boolean hide = small && (i == 0 || i == 4); // small shows 5 moods
            v.setViewVisibility(M[i], hide ? View.GONE : View.VISIBLE);
            v.setTextViewText(M[i], WidgetStore.MOOD_EMOJI[i]);
            v.setInt(M[i], "setBackgroundResource", i == cur ? R.drawable.widget_inner : 0);
            v.setOnClickPendingIntent(M[i],
                    WidgetHub.broadcast(ctx, WidgetActionReceiver.SET_MOOD, id, "mood", String.valueOf(i)));
        }
        v.setTextViewText(R.id.status, cur >= 0
                ? "Logged: " + WidgetStore.MOOD_EMOJI[cur] + " " + WidgetStore.MOOD_LABEL[cur]
                : "Not logged today");
        v.setViewVisibility(R.id.q, small ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.btn_more, small ? View.GONE : View.VISIBLE);
        return v;
    }
}
