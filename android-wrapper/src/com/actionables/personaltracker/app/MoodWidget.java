package com.actionables.personaltracker.app;

import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

/**
 * MOOD widget (v4): DIRECT logging \u2014 tapping an emoji saves immediately,
 * no app launch. "Add a note\u2026" opens the small native note popup.
 */
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
            v.setInt(M[i], "setBackgroundResource", i == cur ? R.drawable.widget_mood_sel : 0);
            v.setOnClickPendingIntent(M[i], WidgetHub.broadcast(ctx, WidgetActionReceiver.SET_MOOD, id, "mood", String.valueOf(i)));
        }

        v.setTextViewText(R.id.m_status, cur >= 0 ? WidgetStore.MOOD_LABEL[cur] : "");
        boolean tall = WidgetHub.rows(ctx, id) >= 3;
        v.setViewVisibility(R.id.m_today, tall ? View.VISIBLE : View.GONE);
        if (tall) v.setTextViewText(R.id.m_val, cur >= 0
                ? WidgetStore.MOOD_EMOJI[cur] + "  " + WidgetStore.MOOD_LABEL[cur]
                : "No mood logged today");
        boolean showNote = WidgetHub.rows(ctx, id) >= 2;
        v.setViewVisibility(R.id.note_btn, showNote ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.note_btn, cur >= 0 ? "\u270E Add a note\u2026" : "Tap a mood to log it");
        if (showNote) v.setOnClickPendingIntent(R.id.note_btn, WidgetHub.popup(ctx, WidgetDialogActivity.A_MOOD_DETAIL, id));
        return v;
    }
}
